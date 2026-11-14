'use client'

import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'
import type { Ref } from 'react'

/** Name des Formularfelds, in dem das CAPTCHA-Token an die Server Action geht. */
export const CAPTCHA_FELDNAME = 'captchaToken'

export type CaptchaInstanz = TurnstileInstance

type CaptchaFeldProps = {
  /** Zugriff auf `reset()` – ein Token gilt nur für eine Anfrage. */
  ref?: Ref<CaptchaInstanz>
  /** Meldet, ob gerade ein gültiges Token vorliegt (Button erst dann freigeben). */
  onBereit?: (bereit: boolean) => void
}

/**
 * CAPTCHA-Feld (Cloudflare Turnstile) für Anmelden, Registrieren und „Passwort vergessen" (AC-23).
 * Das Token landet als verstecktes Feld `captchaToken` im umgebenden Formular; geprüft wird es
 * von Supabase selbst, nicht von WohnWerk.
 */
export function CaptchaFeld({ ref, onBereit }: CaptchaFeldProps) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  if (!siteKey) {
    return (
      <p role="alert" className="text-destructive">
        Die Sicherheitsprüfung ist nicht eingerichtet (NEXT_PUBLIC_TURNSTILE_SITE_KEY fehlt).
      </p>
    )
  }

  return (
    <Turnstile
      ref={ref}
      siteKey={siteKey}
      options={{ language: 'de', theme: 'auto', size: 'flexible', responseFieldName: CAPTCHA_FELDNAME }}
      onSuccess={() => onBereit?.(true)}
      onExpire={() => onBereit?.(false)}
      onError={() => onBereit?.(false)}
    />
  )
}
