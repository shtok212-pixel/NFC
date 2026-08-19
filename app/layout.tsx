import type { Metadata, Viewport } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

// Fraunces carries the premium, editorial moments (table numbers, hero
// headlines) — Inter/system-ui does everything else so the UI still reads
// as a native iOS app rather than a marketing page.
const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["opsz", "SOFT"],
  weight: ["500", "600"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Table Order",
  description: "Scan, browse the menu, and order — all from your table.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0f0f10",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
