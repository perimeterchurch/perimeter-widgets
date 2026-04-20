"use client";

import { SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";

export function SearchTrigger() {
  return (
    <Button
      variant="outline"
      size="sm"
      className="w-[200px] justify-start gap-2 text-muted-foreground"
      onClick={() => {
        document.dispatchEvent(
          new KeyboardEvent("keydown", { key: "k", metaKey: true }),
        );
      }}
    >
      <SearchIcon className="h-3.5 w-3.5" />
      <span className="flex-1 text-left text-xs">Search...</span>
      <Kbd>
        <span className="text-xs">&#8984;K</span>
      </Kbd>
    </Button>
  );
}
