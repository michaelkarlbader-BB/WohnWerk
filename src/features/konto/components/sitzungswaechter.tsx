'use client'

import { useEffect } from 'react'
import { useRahmen, useRahmenVorAbmelden } from '@/components/rahmen/rahmen-kontext'
import { aktivitaetMelden } from '../auth.actions'
import { AKTIVITAET_MELDE_INTERVALL_MS, INAKTIVITAET_MAX_MS } from '../konto.rules'

const KANAL_NAME = 'ww-sitzung'
const ABGEMELDET = 'abgemeldet'
const PRUEF_INTERVALL_MS = 30_000
const EREIGNISSE = ['pointerdown', 'keydown', 'scroll'] as const
// Capture, because `scroll` does not bubble out of scroll containers.
const LAUSCH_OPTIONEN = { passive: true, capture: true } as const

// One channel per tab: a channel never receives its own messages, so the tab that signs
// out is not pulled away from its own sign-out request.
let kanal: BroadcastChannel | null = null

function kanalOeffnen(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null
  kanal ??= new BroadcastChannel(KANAL_NAME)
  return kanal
}

/** EC-4: tells the other tabs that this session ends. Call right before submitting a sign-out form. */
export function meldeAbmeldung(): void {
  try {
    if (kanal) {
      kanal.postMessage(ABGEMELDET)
    } else if (typeof BroadcastChannel !== 'undefined') {
      const einmalig = new BroadcastChannel(KANAL_NAME)
      einmalig.postMessage(ABGEMELDET)
      einmalig.close()
    }
  } catch {
    // The other tabs still notice on their next request or activity report.
  }
}

/** Invisible: ends the visit after 30 minutes without activity (AC-7) or a sign-out in another tab (EC-4). */
export function Sitzungswaechter() {
  const { ohneRueckfrageVerlassen } = useRahmen()
  // The sign-out from the frame's menu tells the other tabs as well (EC-4).
  useRahmenVorAbmelden(meldeAbmeldung)

  useEffect(() => {
    // The request that rendered this page already refreshed the activity cookie.
    let letzteAktivitaet = Date.now()
    let letzteMeldung = Date.now()
    let meldet = false
    let beendet = false

    function verlassen() {
      if (beendet) return
      beendet = true
      // The automatic sign-out never asks about unsaved changes (PROJ-2 EC-3).
      ohneRueckfrageVerlassen()
      // Full navigation, so the proxy decides. Only path + query go into `weiter`.
      const { pathname, search } = window.location
      window.location.assign('/anmelden?weiter=' + encodeURIComponent(pathname + search))
    }

    function abgelaufen(): boolean {
      return Date.now() - letzteAktivitaet >= INAKTIVITAET_MAX_MS
    }

    function pruefen() {
      if (!beendet && abgelaufen()) verlassen()
    }

    function aktivitaet() {
      if (beendet) return
      // Timers are throttled in background tabs and stop during sleep: check before counting.
      if (abgelaufen()) return verlassen()

      const jetzt = Date.now()
      letzteAktivitaet = jetzt
      if (meldet || jetzt - letzteMeldung < AKTIVITAET_MELDE_INTERVALL_MS) return

      meldet = true
      letzteMeldung = jetzt
      aktivitaetMelden()
        .then((antwort) => {
          if (!antwort.aktiv) verlassen()
        })
        .catch(() => {
          // Offline or interrupted: the next report or request decides.
        })
        .finally(() => {
          meldet = false
        })
    }

    function sichtbarkeit() {
      if (document.visibilityState === 'visible') aktivitaet()
    }

    function nachricht(ereignis: MessageEvent) {
      if (ereignis.data === ABGEMELDET) verlassen()
    }

    for (const name of EREIGNISSE) window.addEventListener(name, aktivitaet, LAUSCH_OPTIONEN)
    document.addEventListener('visibilitychange', sichtbarkeit)
    const intervall = window.setInterval(pruefen, PRUEF_INTERVALL_MS)
    const eigenerKanal = kanalOeffnen()
    eigenerKanal?.addEventListener('message', nachricht)

    return () => {
      beendet = true
      for (const name of EREIGNISSE) window.removeEventListener(name, aktivitaet, LAUSCH_OPTIONEN)
      document.removeEventListener('visibilitychange', sichtbarkeit)
      window.clearInterval(intervall)
      if (eigenerKanal) {
        eigenerKanal.removeEventListener('message', nachricht)
        eigenerKanal.close()
        if (kanal === eigenerKanal) kanal = null
      }
    }
  }, [ohneRueckfrageVerlassen])

  return null
}
