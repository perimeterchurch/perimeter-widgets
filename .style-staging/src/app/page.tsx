import { readdirSync } from "node:fs";
import { join } from "node:path";

import type { Metadata } from "next";
import Link from "next/link";

import { CopyInstallButton } from "@/components/site/copy-install-button";
import manifest from "@/lib/demo-manifest.json";

export const metadata: Metadata = {
  title: "Perimeter Style — Design System",
  description:
    "55 shadcn-compatible components, 5 page templates, and design tokens for Perimeter Church projects.",
  openGraph: {
    title: "Perimeter Style — Design System",
    description:
      "55 shadcn-compatible components, 5 page templates, and design tokens for Perimeter Church projects.",
  },
};

const INSTALL_COMMAND = "pnpm dlx shadcn@latest add @perimeter/perimeter-base";

const componentCount = manifest.length;
const themeCount = readdirSync(
  join(process.cwd(), "registry", "themes"),
).filter((f) => f.endsWith(".json")).length;

const STATS = [
  { label: "Components", value: String(componentCount) },
  { label: "Themes", value: String(themeCount) },
  { label: "shadcn CLI Compatible", value: "Yes" },
] as const;

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center gap-6 px-6 py-24 text-center">
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
          Perimeter Style
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          A shadcn-compatible component registry for Perimeter Church. Install
          components directly into your project with the shadcn CLI.
        </p>
        <div className="flex gap-4">
          <Link
            href="/components"
            className="inline-flex h-10 items-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Browse Components
          </Link>
          <Link
            href="/docs/getting-started"
            className="inline-flex h-10 items-center rounded-md border bg-background px-6 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Get Started
          </Link>
        </div>
      </section>

      {/* Quick Start */}
      <section className="border-t bg-muted/30 px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold">Quick Start</h2>
          <p className="mt-2 text-muted-foreground">
            Add components to your project in one command.
          </p>
          <div className="mt-6">
            <CopyInstallButton command={INSTALL_COMMAND} />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-t px-6 py-16">
        <div className="mx-auto grid max-w-3xl gap-8 sm:grid-cols-3">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-bold">{stat.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
