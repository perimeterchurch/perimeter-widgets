import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execSync } from "node:child_process";

interface ThemeFile {
  name: string;
  cssVars: {
    light: Record<string, string>;
    dark: Record<string, string>;
  };
}

const START_MARKER = "/* @generated-themes-start */";
const END_MARKER = "/* @generated-themes-end */";

function cssBlock(selector: string, vars: Record<string, string>): string {
  const entries = Object.entries(vars)
    .map(([key, value]) => `  --${key}: ${value};`)
    .join("\n");
  return `${selector} {\n${entries}\n}`;
}

async function generateThemeCSS() {
  const themesDir = join(process.cwd(), "registry", "themes");
  const globalsPath = join(process.cwd(), "src", "app", "globals.css");

  const files = await readdir(themesDir);
  const jsonFiles = files.filter((f) => f.endsWith(".json")).sort();

  const blocks: string[] = [];

  const defaultFile = jsonFiles.find((f) => f === "default.json");
  if (!defaultFile) {
    throw new Error("registry/themes/default.json is required");
  }

  const defaultTheme: ThemeFile = JSON.parse(
    await readFile(join(themesDir, defaultFile), "utf-8"),
  );
  blocks.push(cssBlock(":root", defaultTheme.cssVars.light));
  blocks.push("");
  blocks.push(cssBlock(".light", defaultTheme.cssVars.light));
  blocks.push("");
  blocks.push(cssBlock(".dark", defaultTheme.cssVars.dark));

  blocks.push("");
  // Shadow DOM consumers
  blocks.push(cssBlock(":host", defaultTheme.cssVars.light));
  blocks.push("");
  blocks.push(cssBlock(':host([data-mode="dark"])', defaultTheme.cssVars.dark));

  for (const file of jsonFiles) {
    if (file === "default.json") continue;

    const theme: ThemeFile = JSON.parse(
      await readFile(join(themesDir, file), "utf-8"),
    );
    const slug = file.replace(".json", "").replace(/-theme$/, "");

    blocks.push("");
    blocks.push(cssBlock(`[data-theme="${slug}"]`, theme.cssVars.light));
    blocks.push("");
    blocks.push(cssBlock(`[data-theme="${slug}"].dark`, theme.cssVars.dark));

    blocks.push("");
    // Shadow DOM
    blocks.push(cssBlock(`:host([data-theme="${slug}"])`, theme.cssVars.light));
    blocks.push("");
    blocks.push(
      cssBlock(
        `:host([data-theme="${slug}"][data-mode="dark"])`,
        theme.cssVars.dark,
      ),
    );
  }

  const globals = await readFile(globalsPath, "utf-8");
  const startIdx = globals.indexOf(START_MARKER);
  const endIdx = globals.indexOf(END_MARKER);

  if (startIdx === -1 || endIdx === -1) {
    throw new Error(
      `globals.css is missing theme markers (${START_MARKER} / ${END_MARKER})`,
    );
  }

  const before = globals.slice(0, startIdx + START_MARKER.length);
  const after = globals.slice(endIdx);
  const updated = before + "\n" + blocks.join("\n") + "\n" + after;

  await writeFile(globalsPath, updated);

  // Format the injected CSS so it matches Prettier's output
  execSync(`pnpm prettier --write ${globalsPath}`, { stdio: "ignore" });

  console.log(`Injected ${jsonFiles.length} theme(s) into ${globalsPath}`);
}

generateThemeCSS().catch((err) => {
  console.error("Failed to generate theme CSS:", err);
  process.exit(1);
});
