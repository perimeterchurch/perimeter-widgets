import { readFile } from "node:fs/promises";
import { join } from "node:path";

export async function extractExampleSources(slug: string): Promise<string[]> {
  const filePath = join(
    process.cwd(),
    "registry",
    "ui",
    "perimeter",
    `${slug}.demo.tsx`,
  );
  const source = await readFile(filePath, "utf-8");

  const sources: string[] = [];
  const renderRegex = /render:\s*\(\)\s*=>\s*\(/g;
  let match;

  while ((match = renderRegex.exec(source)) !== null) {
    const startIdx = match.index + match[0].length;
    const body = extractBalancedParens(source, startIdx);
    if (body) sources.push(body.trim());
  }

  return sources;
}

function extractBalancedParens(
  source: string,
  startIdx: number,
): string | null {
  let depth = 1;
  let i = startIdx;

  while (i < source.length && depth > 0) {
    const ch = source[i];

    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = ch;
      i++;
      while (i < source.length && source[i] !== quote) {
        if (source[i] === "\\") i++;
        i++;
      }
    } else if (ch === "(") {
      depth++;
    } else if (ch === ")") {
      depth--;
      if (depth === 0) {
        return source.slice(startIdx, i);
      }
    }
    i++;
  }

  return null;
}
