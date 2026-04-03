// app/layout.tsx
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Syne, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  weight: ["400", "500", "600", "700", "800"],
});

const ibmMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "ChunkR — Self-Hosted Cloud Storage",
  description: "Your personal cloud storage powered by Telegram. Unlimited. Private. Self-hosted.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${syne.variable} ${ibmMono.variable}`}>
        <body className="bg-[#080c14] text-zinc-100 antialiased font-sans">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}