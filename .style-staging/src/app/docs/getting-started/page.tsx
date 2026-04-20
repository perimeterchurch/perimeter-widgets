import type { Metadata } from "next";
import Link from "next/link";

import { highlight } from "@/lib/highlight";

import { CodeBlock } from "@/components/site/code-block";

export const metadata: Metadata = {
  title: "Getting Started",
  description:
    "Install and configure the Perimeter Style registry in your project.",
  openGraph: {
    title: "Getting Started — Perimeter Style",
    description:
      "Install and configure the Perimeter Style registry in your project.",
  },
};
import { Badge } from "@/components/ui/badge";

const SECTIONS = {
  configRegistry: {
    code: `{
  "registries": {
    "perimeter": {
      "url": "https://style.perimeter.org/r"
    }
  }
}`,
    lang: "json",
  },
  addComponent: {
    code: `pnpm dlx shadcn@latest add @perimeter/button`,
    lang: "bash",
  },
  addBase: {
    code: `pnpm dlx shadcn@latest add @perimeter/perimeter-base`,
    lang: "bash",
  },
  usage: {
    code: `import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

export function MyPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Your content here.</p>
        <Button variant="default">Get Started</Button>
      </CardContent>
    </Card>
  )
}`,
    lang: "tsx",
  },
  dataTheme: {
    code: `<html data-theme="metrics">
  <body>
    {/* Components automatically use the metrics color palette */}
  </body>
</html>`,
    lang: "tsx",
  },
  darkMode: {
    code: `<html class="dark">
  <body>
    {/* All components switch to dark variants */}
  </body>
</html>

{/* Combine with a project theme */}
<html class="dark" data-theme="perimeter-api">
  <body>
    {/* Dark mode + project-specific colors */}
  </body>
</html>`,
    lang: "tsx",
  },
  createTheme: {
    code: `{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "my-project-theme",
  "type": "registry:theme",
  "cssVars": {
    "light": {
      "primary": "oklch(0.55 0.15 200)",
      "primary-foreground": "oklch(0.985 0 0)"
    },
    "dark": {
      "primary": "oklch(0.65 0.15 200)",
      "primary-foreground": "oklch(0.985 0 0)"
    }
  }
}`,
    lang: "json",
  },
} as const;

type SectionKey = keyof typeof SECTIONS;

async function highlightAll() {
  const entries = Object.entries(SECTIONS) as [
    SectionKey,
    (typeof SECTIONS)[SectionKey],
  ][];
  const results = await Promise.all(
    entries.map(
      async ([key, { code, lang }]) =>
        [key, await highlight(code, lang)] as const,
    ),
  );
  return Object.fromEntries(results) as Record<SectionKey, string>;
}

export default async function GettingStartedPage() {
  const html = await highlightAll();

  return (
    <article className="max-w-3xl space-y-12">
      {/* Hero */}
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <h1 className="text-4xl font-bold tracking-tight">Getting Started</h1>
          <Badge variant="secondary">v0.1.0</Badge>
        </div>
        <p className="text-lg text-muted-foreground">
          Install Perimeter Church&apos;s shadcn-compatible components directly
          into your project. You own the source — customize everything.
        </p>
      </header>

      {/* Prerequisites */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">Prerequisites</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { name: "Node.js", detail: "v18 or later" },
            { name: "pnpm", detail: "Package manager" },
            { name: "shadcn", detail: "Tailwind CSS v4 + TypeScript" },
          ].map((item) => (
            <div key={item.name} className="rounded-lg border bg-card p-4">
              <p className="font-medium">{item.name}</p>
              <p className="text-sm text-muted-foreground">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <hr className="border-border" />

      {/* Configure Registry */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">
          1. Configure the Registry
        </h2>
        <p className="text-muted-foreground">
          Add the Perimeter registry to your project&apos;s{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">
            components.json
          </code>
          :
        </p>
        <CodeBlock
          html={html.configRegistry}
          rawCode={SECTIONS.configRegistry.code}
          language={SECTIONS.configRegistry.lang}
          showLineNumbers
        />
      </section>

      {/* Install Components */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">
          2. Install Components
        </h2>
        <p className="text-muted-foreground">
          Add individual components with the shadcn CLI. Each component copies
          its source into your project with all dependencies:
        </p>
        <CodeBlock
          html={html.addComponent}
          rawCode={SECTIONS.addComponent.code}
          language={SECTIONS.addComponent.lang}
        />
        <p className="text-muted-foreground">
          Or install the full base set — all 55 components, tokens, and
          utilities in one command:
        </p>
        <CodeBlock
          html={html.addBase}
          rawCode={SECTIONS.addBase.code}
          language={SECTIONS.addBase.lang}
        />
        <p className="text-sm text-muted-foreground">
          Browse all available components in the{" "}
          <Link
            href="/components"
            className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
          >
            component library
          </Link>
          .
        </p>
      </section>

      {/* Usage */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">
          3. Use in Your Code
        </h2>
        <p className="text-muted-foreground">
          Import installed components from your project&apos;s component
          directory. They work like any other React component:
        </p>
        <CodeBlock
          html={html.usage}
          rawCode={SECTIONS.usage.code}
          language={SECTIONS.usage.lang}
          showLineNumbers
        />
      </section>

      <hr className="border-border" />

      {/* Theming */}
      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">Theming</h2>
          <p className="text-muted-foreground">
            The default palette is a warm stone theme in OKLCH color space.
            Project-specific themes override selected tokens while inheriting
            everything else.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Apply a Project Theme</h3>
          <p className="text-muted-foreground">
            Set the{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">
              data-theme
            </code>{" "}
            attribute on your root element:
          </p>
          <CodeBlock
            html={html.dataTheme}
            rawCode={SECTIONS.dataTheme.code}
            language={SECTIONS.dataTheme.lang}
            showLineNumbers
          />
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">default</Badge>
            <Badge variant="outline">perimeter-api</Badge>
            <Badge variant="outline">metrics</Badge>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Dark Mode</h3>
          <p className="text-muted-foreground">
            Toggle dark mode by adding the{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">
              .dark
            </code>{" "}
            class. This works independently of project themes:
          </p>
          <CodeBlock
            html={html.darkMode}
            rawCode={SECTIONS.darkMode.code}
            language={SECTIONS.darkMode.lang}
            showLineNumbers
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Create a Custom Theme</h3>
          <p className="text-muted-foreground">
            Add a JSON file to{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">
              registry/themes/
            </code>{" "}
            with your overrides. Only specify the tokens you want to change —
            everything else inherits from the default palette:
          </p>
          <CodeBlock
            html={html.createTheme}
            rawCode={SECTIONS.createTheme.code}
            language={SECTIONS.createTheme.lang}
            showLineNumbers
          />
          <p className="text-sm text-muted-foreground">
            See all available tokens on the{" "}
            <Link
              href="/tokens"
              className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
            >
              token reference
            </Link>{" "}
            page.
          </p>
        </div>
      </section>
    </article>
  );
}
