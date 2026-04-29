import { readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import manifest from '../src/lib/demo-manifest.json';
import { TEMPLATE_SLUGS } from '../src/templates';

const BASE_URL = 'https://style.perimeter.org';

/**
 * Routes to omit from auto-discovery. Anything reachable on disk via
 * `app/<seg>/page.tsx` but not user-facing (redirect-only pages, intentional
 * 404s) belongs here.
 */
const SITEMAP_EXCLUDE: ReadonlySet<string> = new Set(['/tokens']);

/**
 * Route segments handled by their own dynamic-route logic below — skip them
 * during static auto-discovery so we don't double-list e.g. `/components`
 * (collected from manifest) or list the dynamic `[slug]` wrapper as a literal.
 */
const SKIP_DYNAMIC_SUBTREES: ReadonlySet<string> = new Set([
    '/components',
    '/templates',
]);

/**
 * Walks `src/app/` and returns every static route reachable through a
 * `page.<ext>` file. Dynamic segments (`[slug]`) and route groups
 * (`(group)`) are skipped — dynamic routes are listed separately from data.
 */
function discoverStaticRoutes(): string[] {
    const appDir = join(process.cwd(), 'src', 'app');
    const routes: string[] = [];

    function hasPageFile(dir: string): boolean {
        return readdirSync(dir).some((f) => f.startsWith('page.'));
    }

    function scan(dir: string, prefix: string) {
        if (hasPageFile(dir) && !SITEMAP_EXCLUDE.has(prefix || '/')) {
            routes.push(prefix || '/');
        }
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            if (!entry.isDirectory()) continue;
            // Dynamic segments and route groups don't translate 1:1 to URLs.
            if (entry.name.startsWith('[') || entry.name.startsWith('(')) {
                continue;
            }
            const sub = join(dir, entry.name);
            const subPrefix = `${prefix}/${entry.name}`;
            if (SKIP_DYNAMIC_SUBTREES.has(subPrefix)) {
                // Top-level page is still in the sitemap, but skip the subtree
                // — dynamic routes inside are added from data instead.
                if (hasPageFile(sub)) routes.push(subPrefix);
                continue;
            }
            scan(sub, subPrefix);
        }
    }

    scan(appDir, '');
    return routes;
}

function generateSitemap(): string {
    const urls = new Set<string>(discoverStaticRoutes());

    const categories = new Set<string>();
    for (const entry of manifest) {
        categories.add(entry.category);
        urls.add(`/components/${entry.category}/${entry.slug}`);
    }
    for (const category of categories) {
        urls.add(`/components/${category}`);
    }

    for (const slug of TEMPLATE_SLUGS) {
        urls.add(`/templates/${slug}`);
    }

    const sortedUrls = [...urls].sort();
    const today = new Date().toISOString().split('T')[0];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sortedUrls.map((url) => `  <url>\n    <loc>${BASE_URL}${url}</loc>\n    <lastmod>${today}</lastmod>\n  </url>`).join('\n')}
</urlset>`;

    return xml;
}

const sitemap = generateSitemap();
writeFileSync(join(process.cwd(), 'public', 'sitemap.xml'), sitemap, 'utf-8');
console.log(
    `Generated sitemap.xml with ${sitemap.match(/<url>/g)?.length ?? 0} URLs`,
);
