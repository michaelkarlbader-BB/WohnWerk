import { NichtGefunden } from '@/components/rahmen/inhalt-meldungen'

// "Diese Seite gibt es nicht." inside the frame (PROJ-2 AC-10): for unknown addresses (via the
// catch-all route) and for detail pages whose record is missing or belongs to someone else
// (features call `notFound()`).
export default function NichtGefundenSeite() {
  return <NichtGefunden />
}
