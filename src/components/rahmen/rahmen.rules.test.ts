import { describe, expect, it } from 'vitest'
import {
  BESTAETIGUNG_DAUER_MS,
  DARSTELLUNG_SCHLUESSEL,
  FENSTER_COOKIE,
  bestaetigungText,
  fensterCookie,
  istMaximiert,
  statustext,
} from './rahmen.rules'

const OFFLINE = 'Keine Verbindung – Änderungen können nicht gespeichert werden.'

describe('statustext', () => {
  it('is "Bereit" when nothing is going on (AC-21)', () => {
    expect(statustext({ online: true, laedt: false, bestaetigung: null })).toBe('Bereit')
    expect(statustext({ online: true, laedt: false, bestaetigung: '  ' })).toBe('Bereit')
  })

  it('shows the confirmation (AC-22)', () => {
    expect(statustext({ online: true, laedt: false, bestaetigung: 'Wohnung gespeichert.' })).toBe(
      'Wohnung gespeichert.'
    )
  })

  it('puts loading above a confirmation and returns to it afterwards (AC-23)', () => {
    const bestaetigung = 'Wohnung gespeichert.'
    expect(statustext({ online: true, laedt: true, bestaetigung })).toBe('Bitte warten…')
    expect(statustext({ online: true, laedt: false, bestaetigung })).toBe(bestaetigung)
  })

  it('puts "no connection" above everything else (AC-33, EC-10)', () => {
    expect(statustext({ online: false, laedt: false, bestaetigung: null })).toBe(OFFLINE)
    expect(statustext({ online: false, laedt: true, bestaetigung: 'Wohnung gespeichert.' })).toBe(OFFLINE)
  })
})

describe('bestaetigungText', () => {
  it('trims, limits to 120 characters and drops empty texts', () => {
    expect(bestaetigungText('  Mieter gespeichert. ')).toBe('Mieter gespeichert.')
    expect(bestaetigungText('x'.repeat(200))).toHaveLength(120)
    expect(bestaetigungText('   ')).toBeNull()
  })
})

describe('Fenster maximiert', () => {
  it('accepts exactly "1" and nothing else (AC-3, SEC-02)', () => {
    expect(istMaximiert('1')).toBe(true)
    for (const wert of [undefined, null, '', '0', 'true', '1 ', ' 1', '11', '1;x', 'on']) {
      expect(istMaximiert(wert)).toBe(false)
    }
  })

  it('writes a one-year cookie and deletes it on restore (AC-3)', () => {
    expect(fensterCookie(true)).toBe('wohnwerk-fenster=1; Path=/; Max-Age=31536000; SameSite=Lax')
    expect(fensterCookie(false)).toBe('wohnwerk-fenster=; Path=/; Max-Age=0; SameSite=Lax')
  })
})

describe('vereinbarte Namen', () => {
  it('keeps the names other parts rely on', () => {
    expect(FENSTER_COOKIE).toBe('wohnwerk-fenster')
    expect(DARSTELLUNG_SCHLUESSEL).toBe('wohnwerk-darstellung')
    expect(BESTAETIGUNG_DAUER_MS).toBe(10_000)
  })
})
