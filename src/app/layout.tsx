import type { Metadata } from "next";
import { DarstellungAnbieter } from "@/components/rahmen/darstellung-anbieter";
import { PROGRAMMNAME } from "@/components/rahmen/navigation.rules";
import "./globals.css";

export const metadata: Metadata = {
  // Pages set only their own label; a tab title never carries a detail name (PROJ-2 AC-36).
  title: { default: PROGRAMMNAME, template: `${PROGRAMMNAME} – %s` },
  description: "Verwaltung vermieteter Eigentumswohnungen",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Font and colours come from globals.css; next-themes sets `light` / `dark` on <html>
  // before the first paint, hence suppressHydrationWarning.
  return (
    <html lang="de" suppressHydrationWarning>
      <body>
        <DarstellungAnbieter>{children}</DarstellungAnbieter>
      </body>
    </html>
  );
}
