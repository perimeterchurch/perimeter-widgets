"use client";

import { createHighlighter, type Highlighter } from "shiki/bundle/web";

const GLOBAL_KEY = "__shiki_client" as const;

function getHighlighter(): Promise<Highlighter> {
  // Cache on globalThis so the singleton survives HMR reloads in dev.
  const cached = (globalThis as Record<string, unknown>)[GLOBAL_KEY] as
    | Promise<Highlighter>
    | undefined;
  if (cached) return cached;

  const promise = createHighlighter({
    themes: ["vitesse-light", "vitesse-dark"],
    langs: ["tsx"],
  });
  (globalThis as Record<string, unknown>)[GLOBAL_KEY] = promise;
  return promise;
}

export async function highlightClient(code: string): Promise<string> {
  const h = await getHighlighter();
  return h.codeToHtml(code, {
    lang: "tsx",
    themes: { light: "vitesse-light", dark: "vitesse-dark" },
  });
}
