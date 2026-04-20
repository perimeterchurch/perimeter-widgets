"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
} from "react";

const STORAGE_KEY_THEME = "perimeter-style-theme";
const STORAGE_KEY_MODE = "perimeter-style-mode";

interface ThemeContextValue {
  theme: string;
  mode: "light" | "dark";
  setTheme: (theme: string) => void;
  setMode: (mode: "light" | "dark") => void;
  toggleMode: () => void;
  availableThemes: string[];
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// Notify subscribers when localStorage changes from within this tab
const themeListeners = new Set<() => void>();
const modeListeners = new Set<() => void>();

function emitTheme() {
  themeListeners.forEach((l) => l());
}
function emitMode() {
  modeListeners.forEach((l) => l());
}

function subscribeTheme(cb: () => void) {
  themeListeners.add(cb);
  return () => {
    themeListeners.delete(cb);
  };
}
function subscribeMode(cb: () => void) {
  modeListeners.add(cb);
  return () => {
    modeListeners.delete(cb);
  };
}

function getThemeSnapshot() {
  return localStorage.getItem(STORAGE_KEY_THEME) ?? "";
}

function getModeSnapshot(): "light" | "dark" {
  const v = localStorage.getItem(STORAGE_KEY_MODE);
  return v === "dark" ? "dark" : "light";
}

interface ThemeProviderProps {
  children: React.ReactNode;
  availableThemes: string[];
  defaultTheme?: string;
  defaultMode?: "light" | "dark";
}

export function ThemeProvider({
  children,
  availableThemes,
  defaultTheme = "",
  defaultMode = "light",
}: ThemeProviderProps) {
  const theme = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    () => defaultTheme,
  );
  const mode = useSyncExternalStore(
    subscribeMode,
    getModeSnapshot,
    () => defaultMode,
  );

  const setTheme = useCallback((t: string) => {
    localStorage.setItem(STORAGE_KEY_THEME, t);
    if (t) {
      document.documentElement.setAttribute("data-theme", t);
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    emitTheme();
  }, []);

  const setMode = useCallback((m: "light" | "dark") => {
    localStorage.setItem(STORAGE_KEY_MODE, m);
    document.documentElement.classList.toggle("dark", m === "dark");
    emitMode();
  }, []);

  const toggleMode = useCallback(() => {
    setMode(mode === "light" ? "dark" : "light");
  }, [mode, setMode]);

  // Sync DOM attributes with persisted state on mount and when values change
  useEffect(() => {
    document.documentElement.classList.toggle("dark", mode === "dark");
    if (theme) {
      document.documentElement.setAttribute("data-theme", theme);
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }, [mode, theme]);

  return (
    <ThemeContext
      value={{ theme, mode, setTheme, setMode, toggleMode, availableThemes }}
    >
      {children}
    </ThemeContext>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
