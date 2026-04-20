"use client";

import { Suspense, useState } from "react";

import { CodeBlock } from "@/components/site/code-block";
import { templateComponents, type TemplateSlug } from "@/templates";

interface TemplateDetailClientProps {
  slug: TemplateSlug;
  codeHtml: string;
  rawCode: string;
}

export function TemplateDetailClient({
  slug,
  codeHtml,
  rawCode,
}: TemplateDetailClientProps) {
  const [view, setView] = useState<"preview" | "code">("preview");
  const Template = templateComponents[slug];

  return (
    <div className="space-y-4">
      {/* Toggle buttons */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setView("preview")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            view === "preview"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          Preview
        </button>
        <button
          type="button"
          onClick={() => setView("code")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            view === "code"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          Code
        </button>
      </div>

      {/* Content */}
      {view === "preview" ? (
        <div className="overflow-hidden rounded-lg border">
          <Suspense
            fallback={
              <div className="flex h-96 items-center justify-center text-sm text-muted-foreground">
                Loading preview...
              </div>
            }
          >
            <Template />
          </Suspense>
        </div>
      ) : (
        <CodeBlock
          html={codeHtml}
          rawCode={rawCode}
          language="tsx"
          filename={`${slug}.tsx`}
        />
      )}
    </div>
  );
}
