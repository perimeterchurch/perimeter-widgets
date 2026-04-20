"use client";

import { useRouter } from "next/navigation";

import type { TemplateSlug } from "@/templates";

import { TemplatePreviewThumb } from "./template-preview-thumb";

export function TemplateCard({
  slug,
  children,
}: {
  slug: TemplateSlug;
  children: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => router.push(`/templates/${slug}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(`/templates/${slug}`);
        }
      }}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-lg border bg-card transition-colors hover:border-primary/50"
    >
      {/* Scaled-down live preview */}
      <div className="relative h-48 overflow-hidden border-b bg-background">
        <TemplatePreviewThumb slug={slug} />
      </div>

      {children}
    </div>
  );
}
