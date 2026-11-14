import { vi } from 'vitest'

import {
  sendeBereitsRegistriert,
  sendeHinweisAlteAdresse,
  sendeSicherheitshinweis,
} from './mail.integration'

vi.mock('server-only', () => ({}))

const fetchMock = vi.fn()

function gesendeteMail() {
  expect(fetchMock).toHaveBeenCalledTimes(1)
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
  return { url, init, body: JSON.parse(init.body as string) }
}

beforeEach(() => {
  fetchMock.mockReset().mockResolvedValue(new Response('{}', { status: 201 }))
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('BREVO_API_KEY', 'test-key')
  vi.stubEnv('MAIL_FROM_ADDRESS', 'noreply@example.com')
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('Versand über Brevo', () => {
  it('sendet per POST an die Brevo-API mit Schlüssel im Header, nie in der Adresse', async () => {
    await expect(sendeBereitsRegistriert('mieter@example.com')).resolves.toBe(true)

    const { url, init, body } = gesendeteMail()
    expect(url).toBe('https://api.brevo.com/v3/smtp/email')
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>)['api-key']).toBe('test-key')
    expect(url).not.toContain('test-key')
    expect(body.sender).toEqual({ name: 'WohnWerk', email: 'noreply@example.com' })
    expect(body.to).toEqual([{ email: 'mieter@example.com' }])
  })

  it('AC-24/AC-28: „bereits registriert“ ist deutsch und als WohnWerk erkennbar', async () => {
    await sendeBereitsRegistriert('a@example.com')

    const { body } = gesendeteMail()
    expect(body.subject).toBe('WohnWerk – Du bist bereits registriert')
    expect(body.textContent).toContain('Du hast bereits ein Konto')
    expect(body.htmlContent).toContain('lang="de"')
    expect(body.htmlContent).toContain('WohnWerk')
  })

  it('AC-17: Hinweis geht an die alte Adresse und nennt die neue', async () => {
    await sendeHinweisAlteAdresse('alt@example.com', 'neu@example.com')

    const { body } = gesendeteMail()
    expect(body.to).toEqual([{ email: 'alt@example.com' }])
    expect(body.subject).toBe('WohnWerk – Deine E-Mail-Adresse wird geändert')
    expect(body.textContent).toContain('neu@example.com')
  })

  it('AC-27: Sicherheitshinweis nach Passwortänderung', async () => {
    await sendeSicherheitshinweis('a@example.com', 'passwort_geaendert')

    const { body } = gesendeteMail()
    expect(body.subject).toBe('WohnWerk – Dein Passwort wurde geändert')
    expect(body.textContent).toContain('Passwort deines WohnWerk-Kontos wurde soeben geändert')
  })

  it('AC-27: Sicherheitshinweis nach Ausschalten der 2FA', async () => {
    await sendeSicherheitshinweis('a@example.com', 'zwei_faktor_aus')

    const { body } = gesendeteMail()
    expect(body.subject).toBe('WohnWerk – Zwei-Faktor-Anmeldung ausgeschaltet')
    expect(body.textContent).toContain('Zwei-Faktor-Anmeldung deines WohnWerk-Kontos wurde soeben ausgeschaltet')
  })

  it('maskiert HTML in eingesetzten Werten', async () => {
    await sendeHinweisAlteAdresse('alt@example.com', '<img src=x onerror=alert(1)>@example.com')

    const { body } = gesendeteMail()
    expect(body.htmlContent).not.toContain('<img')
    expect(body.htmlContent).toContain('&lt;img src=x onerror=alert(1)&gt;@example.com')
  })
})

describe('Fehlerverhalten: eine Benachrichtigung blockiert nie die eigentliche Änderung', () => {
  it('liefert false, wenn Brevo ablehnt, und protokolliert ohne Adresse und Schlüssel', async () => {
    fetchMock.mockResolvedValue(new Response('{"message":"unauthorized"}', { status: 401 }))

    await expect(sendeBereitsRegistriert('geheim@example.com')).resolves.toBe(false)

    const protokoll = JSON.stringify(vi.mocked(console.error).mock.calls)
    expect(protokoll).toContain('401')
    expect(protokoll).not.toContain('geheim@example.com')
    expect(protokoll).not.toContain('test-key')
  })

  it('liefert false statt zu werfen, wenn Brevo nicht erreichbar ist', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'))

    await expect(sendeSicherheitshinweis('geheim@example.com', 'passwort_geaendert')).resolves.toBe(false)
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('geheim@example.com')
  })

  it.each(['BREVO_API_KEY', 'MAIL_FROM_ADDRESS'])('sendet nicht, wenn %s fehlt', async (name) => {
    vi.stubEnv(name, '')

    await expect(sendeBereitsRegistriert('a@example.com')).resolves.toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
