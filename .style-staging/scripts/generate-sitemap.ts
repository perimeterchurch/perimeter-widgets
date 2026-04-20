import { readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import manifest from "../src/lib/demo-manifest.json";
import { TEMPLATE_SLUGS } from "../src/templates";

const BASE_URL = "https://style.perimeter.org";

function discoverDocRoutes(): string[] {
  const docsDir = join(process.cwd(), "src", "app", "docs");
  const routes: string[] = [];

  function scan(dir: string, prefix: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        const sub = join(dir, entry.name);
        const hasPage = readdirSync(sub).some((f) => f.startsWith("page."));
        if (hasPage) routes.push(`${prefix}/${entry.name}`);
        scan(sub, `${prefix}/${entry.name}`);
      }
    }
  }

  scan(docsDir, "/docs");
  return routes;
}

function generateSitemap(): string {
  const urls: string[] = [
    "/",
    "/components",
    "/templates",
    "/tokens",
    "/changelog",
  ];

  urls.push(...discoverDocRoutes());

  const categories = new Set<string>();
  for (const entry of manifest) {
    categories.add(entry.category);
    urls.push(`/components/${entry.category}/${entry.slug}`);
  }
  for (const category of categories) {
    urls.push(`/components/${category}`);
  }

  for (const slug of TEMPLATE_SLUGS) {
    urls.push(`/templates/${slug}`);
  }

  const today = new Date().toISOString().split("T")[0];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url>\n    <loc>${BASE_URL}${url}</loc>\n    <lastmod>${today}</lastmod>\n  </url>`).join("\n")}
</urlset>`;

  return xml;
}

const sitemap = generateSitemap();
writeFileSync(join(process.cwd(), "public", "sitemap.xml"), sitemap, "utf-8");
console.log(
  `Generated sitemap.xml with ${sitemap.match(/<url>/g)?.length ?? 0} URLs`,
);
