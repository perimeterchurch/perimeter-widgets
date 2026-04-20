"use client";

import { useState } from "react";

import { ChevronDownIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { CodeBlock } from "./code-block";

interface ExampleCardProps {
  name: string;
  children: React.ReactNode;
  codeHtml: string;
  rawCode: string;
}

export function ExampleCard({
  name,
  children,
  codeHtml,
  rawCode,
}: ExampleCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border">
      <div className="border-b px-4 py-2">
        <h4 className="text-sm font-medium">{name}</h4>
      </div>

      <div className="flex items-center justify-center p-8">{children}</div>

      <div className="border-t">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="flex w-full items-center gap-1 px-4 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronDownIcon
            className={cn(
              "size-3.5 transition-transform",
              expanded && "rotate-180",
            )}
          />
          {expanded ? "Hide code" : "Show code"}
        </button>

        {expanded && (
          <CodeBlock
            html={codeHtml}
            rawCode={rawCode}
            showHeader={false}
            showLineNumbers
            className="rounded-none rounded-b-lg border-0 border-t"
          />
        )}
      </div>
    </div>
  );
}
