'use client'

import { Button } from '@/components/ui/button'
import { abmelden } from '../auth.actions'
import { meldeAbmeldung } from './sitzungswaechter'

/** "Abmelden" of the status line (AC-9); tells the other open tabs as well (EC-4, BUG-8). */
export function AbmeldenKnopf() {
  return (
    <form action={abmelden} onSubmit={() => meldeAbmeldung()}>
      <Button type="submit" variant="outline" size="sm">
        Abmelden
      </Button>
    </form>
  )
}
