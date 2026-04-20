import { readdirSync } from "node:fs";
import { join } from "node:path";

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/lib/theme-context";
import { TopNav } from "@/components/site/top-nav";
import { SearchPalette } from "@/components/site/search-palette";

import "./globals.css";

// Runs at build time only (output: "export") — discovers theme files automatically
const availableThemes = readdirSync(join(process.cwd(), "registry", "themes"))
  .filter((f) => f.endsWith(".json") && f !== "default.json")
  .map((f) => f.replace(".json", ""))
  .sort();

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: "%s — Perimeter Style",
    default: "Perimeter Style — Design System",
  },
  description:
    "shadcn-compatible component registry for Perimeter Church projects",
  openGraph: {
    type: "website",
    siteName: "Perimeter Style",
    description:
      "shadcn-compatible component registry for Perimeter Church projects",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=localStorage.getItem("perimeter-style-mode");if(m==="dark")document.documentElement.classList.add("dark");var t=localStorage.getItem("perimeter-style-theme");if(t)document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded-md focus:bg-background focus:p-4 focus:text-foreground focus:shadow-lg"
        >
          Skip to content
        </a>
        <ThemeProvider availableThemes={availableThemes}>
          <TopNav />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SearchPalette />
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
