import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { MobileNav, Sidebar } from "@/components/nav";
import { DemoBanner, SiteFooter } from "@/components/shell";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "OpsMind | Industrial Knowledge Intelligence",
  description:
    "AI-powered Industrial Knowledge Intelligence platform for ET AI Hackathon 2026 - Problem Statement 8",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen lg:flex">
          <Sidebar />
          <div className="flex flex-1 flex-col">
            <DemoBanner />
            <MobileNav />
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
              {children}
              <SiteFooter />
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
