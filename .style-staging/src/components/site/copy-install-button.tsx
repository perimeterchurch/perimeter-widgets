"use client";

import { CheckIcon, CopyIcon, TerminalIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

interface CopyInstallButtonProps {
  command: string;
}

export function CopyInstallButton({ command }: CopyInstallButtonProps) {
  const { copied, copy } = useCopyToClipboard();

  function handleCopy() {
    copy(command);
    toast("Copied to clipboard");
  }

  return (
    <div className="overflow-clip rounded-xl border">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          <TerminalIcon className="mr-1 inline-block size-3" />
          Install
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={handleCopy}
          aria-label="Copy command"
        >
          {copied ? (
            <CheckIcon className="size-3.5 text-green-500" />
          ) : (
            <CopyIcon className="size-3.5 text-muted-foreground" />
          )}
        </Button>
      </div>
      <div className="overflow-x-auto px-4 py-3">
        <code className="font-mono text-sm text-muted-foreground">
          $ {command}
        </code>
      </div>
    </div>
  );
}
