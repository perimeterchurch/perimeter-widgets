import type { Metadata } from "next";

import { CodeBlock } from "@/components/site/code-block";
import { highlight } from "@/lib/highlight";

export const metadata: Metadata = {
  title: "Theming",
  description:
    "Create project-specific themes for the Perimeter Style registry.",
  openGraph: {
    title: "Theming — Perimeter Style",
    description:
      "Create project-specific themes for the Perimeter Style registry.",
  },
};

const THEME_EXAMPLE = `{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "my-project",
  "type": "registry:theme",
  "cssVars": {
    "light": {
      "primary": "oklch(0.50 0.16 200)",
      "primary-foreground": "oklch(0.985 0 0)",
      "ring": "oklch(0.50 0.16 200)",
      "chart-1": "oklch(0.50 0.16 200)"
    },
    "dark": {
      "primary": "oklch(0.60 0.16 200)",
      "primary-foreground": "oklch(0.147 0 0)",
      "ring": "oklch(0.60 0.16 200)",
      "chart-1": "oklch(0.60 0.16 200)"
    }
  }
}`;

const APPLY_EXAMPLE = `<html data-theme="my-project" class="dark">`;

export default async function ThemingPage() {
  const themeHtml = await highlight(THEME_EXAMPLE, "json");
  const applyHtml = await highlight(APPLY_EXAMPLE, "html");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Creating a Theme</h1>
        <p className="mt-1 text-muted-foreground">
          Project-specific themes override the default token palette. A theme
          only needs to define tokens that differ from the default.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Create a Theme File</h2>
        <p className="text-sm text-muted-foreground">
          Add a JSON file to{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">
            registry/themes/
          </code>
          . The filename becomes the theme slug. Only include tokens that differ
          from the default.
        </p>
        <CodeBlock html={themeHtml} rawCode={THEME_EXAMPLE} language="json" />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Token Format</h2>
        <p className="text-sm text-muted-foreground">
          All colors use OKLCH format:{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">
            oklch(lightness chroma hue)
          </code>
          . See{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">
            registry/themes/default.json
          </code>{" "}
          for the full token list. Common overrides:{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">
            primary
          </code>
          ,{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">
            primary-foreground
          </code>
          ,{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">
            ring
          </code>
          ,{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">
            chart-1
          </code>
          .
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Build &amp; Apply</h2>
        <p className="text-sm text-muted-foreground">
          Run{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">
            pnpm generate:themes
          </code>{" "}
          to inject CSS. Apply in a consumer project:
        </p>
        <CodeBlock html={applyHtml} rawCode={APPLY_EXAMPLE} language="html" />
      </section>
    </div>
  );
}
