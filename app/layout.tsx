import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SlotShield | Booking Reliability Simulator",
  description: "Rehearse booking failure modes before they reach customers.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "SlotShield | Booking Reliability Simulator",
    description: "Catch booking failures before customers do.",
    images: ["/slotshield-og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "SlotShield | Booking Reliability Simulator",
    description: "Catch booking failures before customers do.",
    images: ["/slotshield-og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}
