import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { TEMPLATE_ENTRIES } from "@/templates";

import { TemplateCard } from "./template-card";

export const metadata: Metadata = {
  title: "Templates",
  description:
    "Full-page template compositions built with Perimeter Style components.",
  openGraph: {
    title: "Templates — Perimeter Style",
    description:
      "Full-page template compositions built with Perimeter Style components.",
  },
};

export default function TemplatesGalleryPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold">Templates</h1>
        <p className="mt-1 text-muted-foreground">
          Full-page compositions built from registry components. Copy and adapt
          them for your own projects.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATE_ENTRIES.map(({ slug, meta }) => (
          <TemplateCard key={slug} slug={slug}>
            {/* Info */}
            <div className="flex flex-1 flex-col gap-2 p-4">
              <h2 className="text-lg font-semibold group-hover:text-primary">
                {meta.name}
              </h2>
              <p className="text-sm text-muted-foreground">
                {meta.description}
              </p>
              <div className="mt-auto flex flex-wrap gap-1 pt-2">
                {meta.components.map((comp) => (
                  <Badge key={comp} variant="secondary">
                    {comp}
                  </Badge>
                ))}
              </div>
            </div>
          </TemplateCard>
        ))}
      </div>
    </div>
  );
}
