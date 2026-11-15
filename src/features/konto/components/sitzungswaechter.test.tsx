import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AKTIVITAET_MELDE_INTERVALL_MS, INAKTIVITAET_MAX_MS } from '../konto.rules'
import { Sitzungswaechter, meldeAbmeldung } from './sitzungswaechter'

const aktivitaetMelden = vi.hoisted(() => vi.fn())
vi.mock('../auth.actions', () => ({ aktivitaetMelden }))

const MINUTE = 60_000
const ZIEL = '/anmelden?weiter=' + encodeURIComponent('/wohnungen?seite=2&q=a b')

/** Same-origin channels as in a browser: a channel never receives its own messages. */
class FakeKanal extends EventTarget {
  static offen = new Set<FakeKanal>()
  constructor(readonly name: string) {
    super()
    FakeKanal.offen.add(this)
  }
  postMessage(data: unknown) {
    for (const k of FakeKanal.offen) {
      if (k !== this && k.name === this.name) k.dispatchEvent(new MessageEvent('message', { data }))
    }
  }
  close() {
    FakeKanal.offen.delete(this)
  }
}

let assign: ReturnType<typeof vi.fn>

function klick() {
  window.dispatchEvent(new Event('pointerdown'))
}

/** Lets the pending Server Action answer arrive. */
async function antwortAbwarten() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0)
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  assign = vi.fn()
  vi.stubGlobal('location', { pathname: '/wohnungen', search: '?seite=2&q=a b', assign })
  vi.stubGlobal('BroadcastChannel', FakeKanal)
  FakeKanal.offen.clear()
  aktivitaetMelden.mockReset()
  aktivitaetMelden.mockResolvedValue({ aktiv: true })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('Sitzungswaechter', () => {
  it('reports activity at most once per interval despite many events', async () => {
    render(<Sitzungswaechter />)

    // The page load itself was the last report.
    klick()
    expect(aktivitaetMelden).not.toHaveBeenCalled()

    vi.advanceTimersByTime(AKTIVITAET_MELDE_INTERVALL_MS)
    for (let i = 0; i < 20; i++) {
      klick()
      window.dispatchEvent(new Event('keydown'))
      window.dispatchEvent(new Event('scroll'))
    }
    await antwortAbwarten()
    klick()
    expect(aktivitaetMelden).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(AKTIVITAET_MELDE_INTERVALL_MS - 1)
    klick()
    expect(aktivitaetMelden).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(1)
    klick()
    expect(aktivitaetMelden).toHaveBeenCalledTimes(2)
    expect(assign).not.toHaveBeenCalled()
  })

  it('never reports in parallel', () => {
    aktivitaetMelden.mockReturnValue(new Promise(() => {}))
    render(<Sitzungswaechter />)

    vi.advanceTimersByTime(AKTIVITAET_MELDE_INTERVALL_MS)
    klick()
    vi.advanceTimersByTime(AKTIVITAET_MELDE_INTERVALL_MS)
    klick()
    expect(aktivitaetMelden).toHaveBeenCalledTimes(1)
  })

  it('does not report without activity', () => {
    render(<Sitzungswaechter />)
    vi.advanceTimersByTime(INAKTIVITAET_MAX_MS - MINUTE)
    expect(aktivitaetMelden).not.toHaveBeenCalled()
    expect(assign).not.toHaveBeenCalled()
  })

  it('counts the tab becoming visible as activity', () => {
    render(<Sitzungswaechter />)
    vi.advanceTimersByTime(AKTIVITAET_MELDE_INTERVALL_MS)
    document.dispatchEvent(new Event('visibilitychange'))
    expect(aktivitaetMelden).toHaveBeenCalledTimes(1)
  })

  it('leaves with the encoded current path and query when the server says inactive', async () => {
    aktivitaetMelden.mockResolvedValue({ aktiv: false })
    render(<Sitzungswaechter />)

    vi.advanceTimersByTime(AKTIVITAET_MELDE_INTERVALL_MS)
    klick()
    await antwortAbwarten()

    expect(assign).toHaveBeenCalledTimes(1)
    expect(assign).toHaveBeenCalledWith(ZIEL)
  })

  it('stays when the report fails', async () => {
    aktivitaetMelden.mockRejectedValue(new Error('offline'))
    render(<Sitzungswaechter />)

    vi.advanceTimersByTime(AKTIVITAET_MELDE_INTERVALL_MS)
    klick()
    await antwortAbwarten()

    expect(assign).not.toHaveBeenCalled()
  })

  it('leaves after 30 minutes without local activity', () => {
    render(<Sitzungswaechter />)

    vi.advanceTimersByTime(INAKTIVITAET_MAX_MS - MINUTE)
    expect(assign).not.toHaveBeenCalled()

    vi.advanceTimersByTime(MINUTE)
    expect(assign).toHaveBeenCalledTimes(1)
    expect(assign).toHaveBeenCalledWith(ZIEL)
  })

  it('postpones leaving when there is activity at minute 29', async () => {
    render(<Sitzungswaechter />)

    vi.advanceTimersByTime(29 * MINUTE)
    klick()
    await antwortAbwarten()

    vi.advanceTimersByTime(29 * MINUTE)
    expect(assign).not.toHaveBeenCalled()

    vi.advanceTimersByTime(MINUTE)
    expect(assign).toHaveBeenCalledTimes(1)
  })

  it('leaves instead of reporting when the first activity comes after the limit', () => {
    render(<Sitzungswaechter />)

    // A sleeping device runs no timers: only the clock moves.
    vi.setSystemTime(Date.now() + INAKTIVITAET_MAX_MS)
    klick()

    expect(aktivitaetMelden).not.toHaveBeenCalled()
    expect(assign).toHaveBeenCalledWith(ZIEL)
  })

  it('leaves when another tab reports a sign-out', () => {
    render(<Sitzungswaechter />)

    new FakeKanal('ww-sitzung').postMessage('etwas anderes')
    expect(assign).not.toHaveBeenCalled()

    new FakeKanal('ww-sitzung').postMessage('abgemeldet')
    expect(assign).toHaveBeenCalledWith(ZIEL)
  })

  it('meldeAbmeldung tells the other tabs but not the own one', () => {
    render(<Sitzungswaechter />)
    const andererTab = new FakeKanal('ww-sitzung')
    const empfangen = vi.fn()
    andererTab.addEventListener('message', (e) => empfangen((e as MessageEvent).data))

    meldeAbmeldung()

    expect(empfangen).toHaveBeenCalledWith('abgemeldet')
    expect(assign).not.toHaveBeenCalled()
  })

  it('works without BroadcastChannel', () => {
    vi.stubGlobal('BroadcastChannel', undefined)
    render(<Sitzungswaechter />)
    expect(() => meldeAbmeldung()).not.toThrow()

    vi.advanceTimersByTime(INAKTIVITAET_MAX_MS)
    expect(assign).toHaveBeenCalledTimes(1)
  })

  it('removes listeners, interval and channel on unmount', () => {
    const { unmount } = render(<Sitzungswaechter />)
    expect(FakeKanal.offen.size).toBe(1)
    unmount()
    expect(FakeKanal.offen.size).toBe(0)

    new FakeKanal('ww-sitzung').postMessage('abgemeldet')
    vi.advanceTimersByTime(AKTIVITAET_MELDE_INTERVALL_MS)
    klick()
    document.dispatchEvent(new Event('visibilitychange'))
    vi.advanceTimersByTime(INAKTIVITAET_MAX_MS)

    expect(aktivitaetMelden).not.toHaveBeenCalled()
    expect(assign).not.toHaveBeenCalled()
  })
})
