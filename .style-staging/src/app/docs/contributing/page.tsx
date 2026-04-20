import type { Metadata } from "next";

import { CodeBlock } from "@/components/site/code-block";
import { highlight } from "@/lib/highlight";

export const metadata: Metadata = {
  title: "Contributing",
  description:
    "Set up the Perimeter Style project locally and contribute changes.",
  openGraph: {
    title: "Contributing — Perimeter Style",
    description:
      "Set up the Perimeter Style project locally and contribute changes.",
  },
};

const SETUP = `git clone <repo-url>
cd style
pnpm install
pnpm dev`;

const BRANCH = `git checkout -b feat/my-change`;

const QUALITY = `pnpm quality    # typecheck + lint + format:check`;

export default async function ContributingPage() {
  const setupHtml = await highlight(SETUP, "bash");
  const branchHtml = await highlight(BRANCH, "bash");
  const qualityHtml = await highlight(QUALITY, "bash");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Contributing</h1>
        <p className="mt-1 text-muted-foreground">
          How to set up the project locally and contribute changes.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Setup</h2>
        <CodeBlock html={setupHtml} rawCode={SETUP} language="bash" />
        <p className="text-sm text-muted-foreground">
          The dev server uses webpack (Turbopack is disabled due to dynamic
          import tracing issues with 55 demo files).
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Branch Workflow</h2>
        <p className="text-sm text-muted-foreground">
          Always create a feature branch — never commit directly to{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">
            dev
          </code>{" "}
          or{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">
            main
          </code>
          . Use conventional prefixes:{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">
            feat:
          </code>
          ,{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">
            fix:
          </code>
          ,{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">
            refactor:
          </code>
          ,{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">
            chore:
          </code>
          ,{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">
            docs:
          </code>
          ,{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">
            test:
          </code>
          .
        </p>
        <CodeBlock html={branchHtml} rawCode={BRANCH} language="bash" />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Quality Checks</h2>
        <p className="text-sm text-muted-foreground">
          Run before merging. Fix formatting on touched files with{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">
            pnpm prettier --write &lt;file&gt;
          </code>
          .
        </p>
        <CodeBlock html={qualityHtml} rawCode={QUALITY} language="bash" />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Adding Components</h2>
        <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
          <li>
            Edit the component in{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">
              registry/ui/perimeter/
            </code>
          </li>
          <li>
            Update or create a{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">
              .demo.tsx
            </code>{" "}
            file alongside it
          </li>
          <li>
            Run{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">
              pnpm registry:build
            </code>{" "}
            to regenerate the registry
          </li>
          <li>
            Run{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">
              pnpm collect:demos
            </code>{" "}
            to update the demo manifest
          </li>
          <li>
            Update{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">
              CHANGELOG.md
            </code>{" "}
            under{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">
              [Unreleased]
            </code>
          </li>
        </ol>
      </section>
    </div>
  );
}
