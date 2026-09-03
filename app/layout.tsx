import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "IntelX — CV Integrity Assurance Platform",
  description: "Offline Air-Gapped Computer Vision Integrity Assurance Platform for MoD / Indian Army DGIS",
  icons: {
    icon: "/logo_withoutlabel.png",
    apple: "/logo_withoutlabel.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#f8fafc] text-[#0f172a] font-sans flex flex-col">{children}</body>
    </html>
  );
}
