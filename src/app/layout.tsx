import type { Metadata } from "next";
import { Press_Start_2P, Nunito } from "next/font/google";
import "nes.css/css/nes.min.css";
import "./globals.css";

const pressStart = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel",
  display: "swap",
});

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Template Farm",
  description:
    "A Stardew Valley-vibed, community-first project-template app. Describe what you want to build; the farm returns a template.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${pressStart.variable} ${nunito.variable} h-full`}
    >
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
