"use client";

import { useState } from "react";
import {
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  HashIcon,
  WrapTextIcon,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

const COLLAPSE_THRESHOLD = 20;

interface CodeBlockProps {
  html: string;
  rawCode: string;
  language?: string;
  filename?: string;
  showHeader?: boolean;
  showLineNumbers?: boolean;
  className?: string;
}

export function CodeBlock({
  html,
  rawCode,
  language,
  filename,
  showHeader = true,
  showLineNumbers = false,
  className,
}: CodeBlockProps) {
  const { copied, copy } = useCopyToClipboard();
  const [lineNumbers, setLineNumbers] = useState(showLineNumbers);
  const [wordWrap, setWordWrap] = useState(false);

  const lineCount = rawCode.split("\n").length;
  const digitCount = String(lineCount).length;
  const isCollapsible = showHeader && lineCount > COLLAPSE_THRESHOLD;
  const [expanded, setExpanded] = useState(!isCollapsible);

  const label = filename ?? language;

  function handleCopy() {
    copy(rawCode);
    toast("Copied to clipboard");
  }

  return (
    <div
      className={cn(
        "group relative overflow-clip rounded-xl border",
        className,
      )}
    >
      {showHeader && (
        <div className="flex items-center justify-between border-b px-4 py-2">
          <div>
            {label && (
              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {label}
              </span>
            )}
          </div>

          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => setLineNumbers((prev) => !prev)}
              aria-label={
                lineNumbers ? "Hide line numbers" : "Show line numbers"
              }
            >
              <HashIcon
                className={cn(
                  "size-3.5 transition-colors",
                  lineNumbers ? "text-foreground" : "text-muted-foreground",
                )}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => setWordWrap((prev) => !prev)}
              aria-label={wordWrap ? "Disable word wrap" : "Enable word wrap"}
            >
              <WrapTextIcon
                className={cn(
                  "size-3.5 transition-colors",
                  wordWrap ? "text-foreground" : "text-muted-foreground",
                )}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={handleCopy}
              aria-label="Copy code"
            >
              {copied ? (
                <CheckIcon className="size-3.5 text-green-500" />
              ) : (
                <CopyIcon className="size-3.5 text-muted-foreground" />
              )}
            </Button>
          </div>
        </div>
      )}

      <div className="relative">
        <div
          className={cn(
            "overflow-x-auto text-sm [&_pre]:m-0 [&_pre]:min-w-fit [&_pre]:rounded-none [&_pre]:border-0 [&_pre]:p-4 [&_code]:font-mono",
            lineNumbers && "code-line-numbers",
            wordWrap &&
              "code-word-wrap [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_pre]:min-w-0",
            !expanded && "max-h-[480px] overflow-hidden",
          )}
          style={
            {
              "--line-number-width": `${digitCount}ch`,
              "--line-number-gutter": `calc(${digitCount}ch + 0.5rem)`,
            } as React.CSSProperties
          }
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {!expanded && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />
        )}
      </div>

      {isCollapsible && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="flex w-full items-center justify-center gap-1 border-t py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronDownIcon
            className={cn(
              "size-3.5 transition-transform",
              expanded && "rotate-180",
            )}
          />
          {expanded ? "Show less" : `Show more (${lineCount} lines)`}
        </button>
      )}
    </div>
  );
}
