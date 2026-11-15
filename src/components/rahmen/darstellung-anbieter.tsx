'use client'

import type { ReactNode } from 'react'
import { ThemeProvider } from 'next-themes'
import { DARSTELLUNG_SCHLUESSEL } from './rahmen.rules'

/**
 * Hell / Dunkel / Wie System for the whole app, including the sign-in window (AC-18–20).
 * next-themes puts `light` or `dark` on <html> before the first paint (no flash), follows the
 * device setting live while "system" is chosen and remembers the choice in localStorage.
 */
export function DarstellungAnbieter({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      storageKey={DARSTELLUNG_SCHLUESSEL}
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  )
}
