"use client";

import { PaletteIcon } from "lucide-react";

import { useTheme } from "@/lib/theme-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function formatThemeName(slug: string): string {
  return slug
    .split("-")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

export function ThemeSwitcher() {
  const { theme, setTheme, availableThemes } = useTheme();

  return (
    <Select
      value={theme}
      onValueChange={(value: string | null) => setTheme(value ?? "")}
    >
      <SelectTrigger className="w-[160px] h-8 gap-1.5 border-primary/30 text-xs">
        <PaletteIcon className="size-3.5 text-muted-foreground" />
        <SelectValue placeholder="Default" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="">Default</SelectItem>
        {availableThemes.map((t) => (
          <SelectItem key={t} value={t}>
            {formatThemeName(t)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
