import { readdirSync, statSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';

const DIST_DIR = resolve(import.meta.dirname, '../dist');

interface ManifestEntry {
    file: string;
    sizeBytes: number;
    buildTimestamp: string;
}

interface Manifest {
    widgets: Record<string, ManifestEntry>;
}

function generateManifest(): void {
    const manifest: Manifest = { widgets: {} };

    let entries: string[];
    try {
        entries = readdirSync(DIST_DIR);
    } catch {
        console.log('No dist/ directory found. Skipping manifest generation.');
        return;
    }

    for (const entry of entries) {
        const entryPath = join(DIST_DIR, entry);
        const stat = statSync(entryPath);

        if (!stat.isDirectory()) continue;

        const jsFile = `${entry}.js`;
        const jsPath = join(entryPath, jsFile);

        try {
            const jsStat = statSync(jsPath);
            manifest.widgets[entry] = {
                file: `dist/${entry}/${jsFile}`,
                sizeBytes: jsStat.size,
                buildTimestamp: new Date().toISOString(),
            };
        } catch {
            console.warn(`Warning: ${jsPath} not found, skipping.`);
        }
    }

    const outputPath = join(DIST_DIR, 'manifest.json');
    writeFileSync(outputPath, JSON.stringify(manifest, null, 2) + '\n');
    console.log(`Manifest written to ${outputPath}`);
    console.log(`Widgets: ${Object.keys(manifest.widgets).join(', ')}`);
}

generateManifest();
