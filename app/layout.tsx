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
  title: "FOMO_SCANNER | Radar",
  description: "Real-time Robinhood Chain New Launch & Momentum Radar",
  themeColor: "#000000", // Memaksa warna tab browser di mobile menjadi hitam
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="min-h-screen bg-black text-neutral-200 selection:bg-white selection:text-black">
        {children}
      </body>
    </html>
  );
}