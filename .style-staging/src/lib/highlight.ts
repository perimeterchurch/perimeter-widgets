import { createHighlighter, type Highlighter } from "shiki";

const GLOBAL_KEY = "__shiki_server" as const;

function getHighlighter(): Promise<Highlighter> {
  // Cache on globalThis so the singleton survives webpack HMR reloads in dev.
  const cached = (globalThis as Record<string, unknown>)[GLOBAL_KEY] as
    | Promise<Highlighter>
    | undefined;
  if (cached) return cached;

  const promise = createHighlighter({
    themes: ["vitesse-light", "vitesse-dark"],
    langs: ["tsx", "bash", "json", "css", "html"],
  });
  (globalThis as Record<string, unknown>)[GLOBAL_KEY] = promise;
  return promise;
}

export async function highlight(
  code: string,
  lang: string = "tsx",
): Promise<string> {
  const h = await getHighlighter();
  return h.codeToHtml(code, {
    lang,
    themes: { light: "vitesse-light", dark: "vitesse-dark" },
  });
}
