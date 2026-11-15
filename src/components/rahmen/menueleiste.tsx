'use client'

import { Fragment } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { Menue, MenueEintrag } from './navigation.rules'
import { useMenues } from './use-menues'

// Retro look through classes only - src/components/ui stays untouched.
const FLAECHE = 'edge-raised min-w-44 rounded-none border-0 bg-background p-0.5 text-foreground'
const EINTRAG =
  'rounded-none py-1 pl-6 pr-4 text-sm focus:bg-primary focus:text-primary-foreground data-[disabled]:text-muted-foreground data-[disabled]:opacity-100'
const TRENNER = 'mx-0 my-0.5 h-px bg-edge-shadow'

/** Classic menus have a line where a new kind of entry starts. */
function trennerDavor(menue: Menue, index: number): boolean {
  if (index === 0) return false
  const eintrag = menue.eintraege[index]
  const davor = menue.eintraege[index - 1]
  return eintrag.art !== davor.art
}

type MenueleisteProps = {
  /** Opens the dialog "Über WohnWerk". */
  onUeber: () => void
  className?: string
}

/**
 * Menu bar of the desktop: five separate dropdown menus, so every title is reachable with Tab
 * (AC-30). What the entries offer and do comes from `useMenues` - the same as in the drawer.
 */
export function Menueleiste({ onUeber, className }: MenueleisteProps) {
  const { menues, ausfuehren, darstellung, darstellungWaehlen } = useMenues(onUeber)

  function eintragZeichnen(eintrag: MenueEintrag) {
    if (eintrag.art === 'darstellung') {
      return (
        <DropdownMenuSub>
          <DropdownMenuSubTrigger
            className={cn(EINTRAG, 'pr-1 data-[state=open]:bg-primary data-[state=open]:text-primary-foreground')}
          >
            {eintrag.beschriftung}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className={FLAECHE}>
            <DropdownMenuRadioGroup value={darstellung} onValueChange={darstellungWaehlen}>
              {eintrag.optionen.map((option) => (
                <DropdownMenuRadioItem key={option.wert} value={option.wert} className={EINTRAG}>
                  {option.beschriftung}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      )
    }

    const markiert = eintrag.art === 'ziel' && eintrag.markiert
    return (
      <DropdownMenuItem
        disabled={!eintrag.verfuegbar}
        aria-current={markiert ? 'page' : undefined}
        className={cn(EINTRAG, 'relative')}
        onSelect={() => ausfuehren(eintrag)}
      >
        {markiert && (
          <span aria-hidden="true" className="absolute left-2">
            •
          </span>
        )}
        {eintrag.beschriftung}
      </DropdownMenuItem>
    )
  }

  return (
    <nav aria-label="Menü" className={cn('flex items-center', className)}>
      {menues.map((menue) => (
        <DropdownMenu key={menue.kennung} modal={false}>
          <DropdownMenuTrigger
            aria-label={menue.titel === '?' ? 'Hilfe' : undefined}
            className="px-2 py-0.5 hover:bg-primary-subtle data-[state=open]:bg-primary data-[state=open]:text-primary-foreground"
          >
            {menue.titel}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" sideOffset={0} className={FLAECHE}>
            {menue.eintraege.map((eintrag, index) => (
              <Fragment key={eintrag.beschriftung}>
                {trennerDavor(menue, index) && <DropdownMenuSeparator className={TRENNER} />}
                {eintragZeichnen(eintrag)}
              </Fragment>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ))}
    </nav>
  )
}
