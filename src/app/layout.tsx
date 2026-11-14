import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WohnWerk",
  description: "Verwaltung vermieteter Eigentumswohnungen",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Font, colours and the light/dark switch (OS preference) come from globals.css.
  return (
    <html lang="de" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
