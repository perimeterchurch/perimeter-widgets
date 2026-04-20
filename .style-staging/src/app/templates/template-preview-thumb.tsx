"use client";

import { Suspense } from "react";

import { templateComponents, type TemplateSlug } from "@/templates";

export function TemplatePreviewThumb({ slug }: { slug: TemplateSlug }) {
  const Template = templateComponents[slug];
  if (!Template) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 origin-top-left scale-[0.25]"
      inert
    >
      <div className="h-[calc(100%/0.25)] w-[calc(100%/0.25)]">
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              Loading...
            </div>
          }
        >
          <Template />
        </Suspense>
      </div>
    </div>
  );
}
