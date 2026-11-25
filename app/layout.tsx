import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/inter";
import "@fontsource-variable/syne";
import "@fontsource/syncopate/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Odyssey · University Library",
  description: "A personal library for the universities you’re exploring.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
