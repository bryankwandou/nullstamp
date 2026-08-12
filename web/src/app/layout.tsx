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
  title: "Nullstamp — verifiable receipts for agents that touch personal data",
  description:
    "Every time an agent uses someone's personal data, Nullstamp issues a receipt naming which fields were used and where they went, without ever holding the values. Built on the Terminal 3 ADK.",
  metadataBase: new URL("https://nullstamp.vercel.app"),
  openGraph: {
    title: "Nullstamp",
    description:
      "Receipts anyone can recompute, for agent calls that touch personal data.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
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
