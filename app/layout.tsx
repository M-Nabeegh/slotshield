import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SlotShield | Booking Reliability Simulator",
  description: "Rehearse the moment booking trust breaks with a public reliability simulator.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "SlotShield | Booking Reliability Simulator",
    description: "Rehearse the moment booking trust breaks.",
    images: ["/slotshield-og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "SlotShield | Booking Reliability Simulator",
    description: "Rehearse the moment booking trust breaks.",
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
      <body>{children}</body>
    </html>
  );
}
