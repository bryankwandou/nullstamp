import type { Metadata } from "next";
import { Inter_Tight, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nullstamp — bukti terverifikasi untuk agent yang menyentuh data pribadi",
  description:
    "Setiap kali agent memakai data pribadi seseorang, Nullstamp menerbitkan bukti yang menyebut field apa yang dipakai dan ke mana dikirim, tanpa pernah memuat nilainya. Dibangun di atas Terminal 3 ADK.",
  metadataBase: new URL("https://nullstamp.vercel.app"),
  openGraph: {
    title: "Nullstamp",
    description:
      "Bukti yang bisa dihitung ulang siapa pun, untuk panggilan agent yang menyentuh data pribadi.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${interTight.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
