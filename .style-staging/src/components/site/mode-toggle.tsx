"use client";

import { Sun, Moon } from "lucide-react";

import { useTheme } from "@/lib/theme-context";
import { Button } from "@/components/ui/button";

export function ModeToggle() {
  const { mode, toggleMode } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={toggleMode}
    >
      {mode === "light" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
      <span className="sr-only">
        Toggle {mode === "light" ? "dark" : "light"} mode
      </span>
    </Button>
  );
}
