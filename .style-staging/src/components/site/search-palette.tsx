"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  CommandDialog,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import manifest from "@/lib/demo-manifest.json";
import type { ManifestEntry } from "@/lib/demo-types";

export function SearchPalette() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<Element | null>(null);
  const router = useRouter();
  const entries = manifest as ManifestEntry[];

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => {
          if (!prev) triggerRef.current = document.activeElement;
          return !prev;
        });
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSelect = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  const grouped: Record<string, ManifestEntry[]> = {};
  for (const entry of entries) {
    if (!grouped[entry.category]) grouped[entry.category] = [];
    grouped[entry.category].push(entry);
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (!value && triggerRef.current instanceof HTMLElement) {
          triggerRef.current.focus();
          triggerRef.current = null;
        }
      }}
      title="Search"
      description="Search for components, templates, and more."
    >
      <Command>
        <CommandInput placeholder="Search components..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([category, items]) => (
              <CommandGroup key={category} heading={category}>
                {items.map((entry) => (
                  <CommandItem
                    key={entry.slug}
                    value={`${entry.name} ${entry.category}`}
                    onSelect={() =>
                      handleSelect(
                        `/components/${entry.category}/${entry.slug}`,
                      )
                    }
                  >
                    {entry.name}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {entry.category}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          <CommandGroup heading="Pages">
            <CommandItem
              value="Getting Started"
              onSelect={() => handleSelect("/docs/getting-started")}
            >
              Getting Started
            </CommandItem>
            <CommandItem
              value="Templates"
              onSelect={() => handleSelect("/templates")}
            >
              Templates
            </CommandItem>
            <CommandItem
              value="Tokens"
              onSelect={() => handleSelect("/tokens")}
            >
              Tokens
            </CommandItem>
            <CommandItem
              value="Theming Guide"
              onSelect={() => handleSelect("/docs/theming")}
            >
              Theming Guide
            </CommandItem>
            <CommandItem
              value="Contributing"
              onSelect={() => handleSelect("/docs/contributing")}
            >
              Contributing
            </CommandItem>
            <CommandItem
              value="Troubleshooting"
              onSelect={() => handleSelect("/docs/troubleshooting")}
            >
              Troubleshooting
            </CommandItem>
            <CommandItem
              value="Changelog"
              onSelect={() => handleSelect("/changelog")}
            >
              Changelog
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
