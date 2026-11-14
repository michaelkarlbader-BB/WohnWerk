// App-owned account mails (AC-17 old address, AC-24 "already registered", AC-27 security notice),
// sent through the Brevo transactional API. Supabase sends the link mails itself.
import 'server-only'

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email'
const ZEITLIMIT_MS = 10_000

export type Sicherheitsanlass = 'passwort_geaendert' | 'zwei_faktor_aus'

type Mail = { betreff: string; absaetze: string[] }

const SICHERHEITSHINWEIS: Record<Sicherheitsanlass, Mail> = {
  passwort_geaendert: {
    betreff: 'WohnWerk – Dein Passwort wurde geändert',
    absaetze: [
      'das Passwort deines WohnWerk-Kontos wurde soeben geändert.',
      'Warst du das nicht? Dann setze dein Passwort sofort über „Passwort vergessen“ im Anmeldefenster zurück.',
    ],
  },
  zwei_faktor_aus: {
    betreff: 'WohnWerk – Zwei-Faktor-Anmeldung ausgeschaltet',
    absaetze: [
      'die Zwei-Faktor-Anmeldung deines WohnWerk-Kontos wurde soeben ausgeschaltet.',
      'Warst du das nicht? Dann ändere sofort dein Passwort und schalte die Zwei-Faktor-Anmeldung in den Kontoeinstellungen wieder ein.',
    ],
  },
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function alsHtml({ betreff, absaetze }: Mail): string {
  const inhalt = ['Hallo,', ...absaetze]
    .map((absatz) => `<p style="margin:0 0 12px;">${escapeHtml(absatz)}</p>`)
    .join('')
  return (
    `<!doctype html><html lang="de"><body style="margin:0;padding:16px;background:#3A5F8A;font-family:Tahoma,Verdana,'Segoe UI',sans-serif;font-size:14px;color:#1C1C1C;">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#D4D0C8;border:2px solid #404040;">` +
    `<tr><td style="background:#0A246A;color:#FAFAF7;font-weight:bold;padding:6px 10px;">${escapeHtml(betreff)}</td></tr>` +
    `<tr><td style="padding:16px;">${inhalt}</td></tr>` +
    `<tr><td style="padding:6px 10px;border-top:1px solid #808080;color:#4F4F4F;font-size:12px;">Diese E-Mail wurde automatisch von WohnWerk versendet.</td></tr>` +
    `</table></body></html>`
  )
}

function alsText({ absaetze }: Mail): string {
  return ['Hallo,', ...absaetze, 'Diese E-Mail wurde automatisch von WohnWerk versendet.'].join('\n\n')
}

/**
 * Sends one mail. Never throws: a failed notification must not block the change it reports
 * (design.md → Fehlerarten). Returns whether Brevo accepted the mail. Logs carry no address.
 */
async function senden(an: string, mail: Mail): Promise<boolean> {
  const apiKey = process.env.BREVO_API_KEY
  const absender = process.env.MAIL_FROM_ADDRESS
  if (!apiKey || !absender) {
    console.error('[konto/mail] BREVO_API_KEY oder MAIL_FROM_ADDRESS fehlt – Mail nicht gesendet.')
    return false
  }

  try {
    const antwort = await fetch(BREVO_URL, {
      method: 'POST',
      headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: 'WohnWerk', email: absender },
        to: [{ email: an }],
        subject: mail.betreff,
        htmlContent: alsHtml(mail),
        textContent: alsText(mail),
      }),
      signal: AbortSignal.timeout(ZEITLIMIT_MS),
    })
    if (!antwort.ok) {
      console.error(`[konto/mail] Brevo hat die Mail abgelehnt (HTTP ${antwort.status}).`)
      return false
    }
    return true
  } catch {
    console.error('[konto/mail] Brevo ist nicht erreichbar – Mail nicht gesendet.')
    return false
  }
}

/** AC-17: tells the old address that the login address is being changed. */
export function sendeHinweisAlteAdresse(alteAdresse: string, neueAdresse: string): Promise<boolean> {
  return senden(alteAdresse, {
    betreff: 'WohnWerk – Deine E-Mail-Adresse wird geändert',
    absaetze: [
      `für dein WohnWerk-Konto wurde eine neue E-Mail-Adresse angegeben: ${neueAdresse}. Sie gilt als Login, sobald sie über den Link bestätigt wurde, den wir dorthin gesendet haben.`,
      'Warst du das nicht? Dann melde dich an, ändere dein Passwort und prüfe die Adresse in den Kontoeinstellungen.',
    ],
  })
}

/** AC-24: someone tried to register with an address that already has an account. */
export function sendeBereitsRegistriert(email: string): Promise<boolean> {
  return senden(email, {
    betreff: 'WohnWerk – Du bist bereits registriert',
    absaetze: [
      'mit dieser E-Mail-Adresse wurde gerade eine Registrierung bei WohnWerk versucht. Du hast bereits ein Konto – melde dich einfach an.',
      'Passwort vergessen? Über „Passwort vergessen“ im Anmeldefenster legst du ein neues fest. Warst du das nicht, musst du nichts weiter tun.',
    ],
  })
}

/** AC-27: security notice after a password change or after switching 2FA off. */
export function sendeSicherheitshinweis(email: string, anlass: Sicherheitsanlass): Promise<boolean> {
  return senden(email, SICHERHEITSHINWEIS[anlass])
}
