'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog'
import { PROGRAMMNAME } from './navigation.rules'
import { RahmenLink } from './rahmen-kontext'

type UeberDialogProps = {
  offen: boolean
  onOffenChange: (offen: boolean) => void
  /** Version number as finished text, read on the server from package.json. */
  version: string
}

/** Dialog "Über WohnWerk": name, version and the links to the legal pages (AC-16). */
export function UeberDialog({ offen, onOffenChange, version }: UeberDialogProps) {
  return (
    <Dialog open={offen} onOpenChange={onOffenChange}>
      {/* The built-in close button (English label) is hidden; "OK" and Esc close the dialog. */}
      <DialogContent className="edge-raised w-[calc(100%-2rem)] max-w-sm gap-0 border-0 bg-background p-1 text-foreground sm:rounded-none [&>button:last-child]:hidden">
        <DialogTitle className="titlebar truncate px-2 py-1 text-base font-bold leading-normal tracking-normal md:text-sm">
          Über {PROGRAMMNAME}
        </DialogTitle>
        <div className="space-y-2 p-3">
          <p className="text-lg font-bold">{PROGRAMMNAME}</p>
          <DialogDescription className="text-base text-foreground md:text-sm">
            Version {version}
          </DialogDescription>
          <p className="flex flex-wrap gap-x-4">
            {/* Through the frame, so unsaved changes ask first (AC-27). */}
            <RahmenLink
              href="/datenschutz"
              className="inline-flex min-h-11 items-center underline md:min-h-0"
              onClick={() => onOffenChange(false)}
            >
              Datenschutz
            </RahmenLink>
            <RahmenLink
              href="/impressum"
              className="inline-flex min-h-11 items-center underline md:min-h-0"
              onClick={() => onOffenChange(false)}
            >
              Impressum
            </RahmenLink>
          </p>
        </div>
        <DialogFooter className="p-3 pt-0">
          <DialogClose asChild>
            <Button type="button">OK</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
