import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Troubleshooting",
  description: "Common issues and solutions for the Perimeter Style project.",
  openGraph: {
    title: "Troubleshooting — Perimeter Style",
    description: "Common issues and solutions for the Perimeter Style project.",
  },
};

const ISSUES = [
  {
    title: "Dev server hangs on startup",
    description:
      "Turbopack cannot trace 55 dynamic demo imports. The pnpm dev command already uses --webpack to avoid this. If you see a hang, make sure you're running pnpm dev (not next dev directly).",
  },
  {
    title: "Components look outdated",
    description:
      "Run pnpm registry:build to regenerate the built registry JSON in public/r/. This must be run after any change to files in registry/ui/perimeter/.",
  },
  {
    title: "Theme not applying",
    description:
      "Check that the data-theme attribute is set on the <html> element. For dark mode, ensure the .dark class is also present. Run pnpm generate:themes if you've modified theme JSON files.",
  },
  {
    title: "Demo not showing in showcase",
    description:
      "Run pnpm collect:demos to regenerate the demo manifest and import map. Verify your demo file exports meta, controls, Playground, and examples.",
  },
  {
    title: "Build fails with type errors",
    description:
      "Run pnpm typecheck to see all errors. Common causes: missing return types on async functions, incorrect import paths after moving files.",
  },
];

export default function TroubleshootingPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Troubleshooting</h1>
        <p className="mt-1 text-muted-foreground">
          Common issues and how to resolve them.
        </p>
      </div>

      <div className="space-y-6">
        {ISSUES.map((issue) => (
          <section key={issue.title} className="space-y-2">
            <h2 className="text-lg font-semibold">{issue.title}</h2>
            <p className="text-sm text-muted-foreground">{issue.description}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
