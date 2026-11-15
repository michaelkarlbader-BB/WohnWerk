import Link from 'next/link'
import type { ReactNode } from 'react'

// Signed-out desktop (docs/app-shell.md): exactly one window centred on the desktop surface,
// no menu, no areas. On the phone the window fills the width on the grey window surface.
export default function AbgemeldetLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-dvh md:flex md:flex-col md:items-center md:justify-center md:p-4">
      <div className="w-full md:w-[28rem]">{children}</div>
      {/* AC-25: legal links on every signed-out window. Dark text on the grey surface (phone),
          light text on the desktop surface (md+) - both well above 4.5:1 in light and dark. */}
      <nav
        aria-label="Rechtliches"
        className="flex flex-wrap justify-center gap-x-4 px-3 py-2 text-foreground md:text-primary-foreground"
      >
        <Link href="/datenschutz" className="inline-flex min-h-11 items-center underline md:min-h-0">
          Datenschutz
        </Link>
        <Link href="/impressum" className="inline-flex min-h-11 items-center underline md:min-h-0">
          Impressum
        </Link>
      </nav>
    </main>
  )
}
