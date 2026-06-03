import { useMemo, useState } from 'react';
import { useParams } from 'react-router';
import type { WidgetDefinition } from '@perimeter/widget-runtime';
import { Card, CardContent } from '@perimeter/ui/card';
import { Button } from '@perimeter/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@perimeter/ui/tabs';
import { toWidgetEntries, widgetDefGlob, widgetCssGlob, type WidgetEntry } from '../lib/discovery';
import { WidgetPreview } from '../components/WidgetPreview';
import { Canvas } from '../components/Canvas';
import { ConfigPanel } from '../components/ConfigPanel';
import { ThemeEditor } from '../components/ThemeEditor';
import { NotFoundPage } from './NotFoundPage';

/**
 * Build the production embed snippet for a widget. This is the canonical CDN
 * host/path a host page (WordPress) uses — keep it byte-for-byte in sync with
 * docs/hosting-and-release.md and the WidgetPage test, which asserts it exactly.
 */
function embedSnippet(slug: string): string {
  return (
    `<div data-perimeter-widget="${slug}"></div>\n` +
    `<script src="https://widgets.perimeter.org/${slug}/latest.js" async></script>`
  );
}

/** The generated embed snippet with a copy-to-clipboard control. Dogfoods Button. */
function EmbedSnippet({ slug }: { slug: string }) {
  const code = embedSnippet(slug);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    void navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-fg">Embed</span>
        <Button type="button" variant="outline" size="sm" onClick={copy}>
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <pre className="overflow-x-auto rounded-md bg-fg px-3 py-3 font-mono text-xs leading-relaxed text-bg">
        {code}
      </pre>
    </div>
  );
}

/**
 * The widget route: a host-page-sim canvas mounting the widget through the real
 * mount() (parity with production), beside an inspector with Config / Theme tabs
 * and the generated embed snippet. (Tasks 5–8 grow the canvas toolbar + dev-only
 * built-bundle toggle around this; for now it preserves the old App.tsx behavior
 * under a route.) Unknown slugs render the 404 page.
 */
export function WidgetPage() {
  const { slug } = useParams();
  const widgets = useMemo(() => toWidgetEntries(widgetDefGlob, widgetCssGlob), []);
  const entry = slug ? widgets.find((w) => w.slug === slug) : undefined;

  if (!entry) return <NotFoundPage />;
  return <WidgetView key={entry.slug} entry={entry} />;
}

function WidgetView({ entry }: { entry: WidgetEntry }) {
  const [configOverrides, setConfigOverrides] = useState<Record<string, unknown>>({});
  const [tokenOverrides, setTokenOverrides] = useState<Record<string, string>>({});
  const [def, setDef] = useState<WidgetDefinition | null>(null);

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border px-6 py-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">Widget</p>
        <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-fg">{entry.slug}</h1>
      </header>

      <div className="grid flex-1 grid-cols-1 overflow-hidden xl:grid-cols-[1fr_22rem]">
        {/* Preview canvas — viewport-preset + background toolbar around the real
            mount(). Canvas owns the scroll/background and swaps in the host-page
            sim (HostFrame) when its host-sim background is selected (the default). */}
        <Canvas slug={entry.slug}>
          <WidgetPreview
            entry={entry}
            configOverrides={configOverrides}
            tokenOverrides={tokenOverrides}
            onDefinition={setDef}
          />
        </Canvas>

        {/* Inspector — config / theme tabs + embed snippet. */}
        <aside className="overflow-y-auto border-t border-border p-4 xl:border-l xl:border-t-0">
          <Tabs defaultValue="config" className="gap-4">
            <TabsList className="w-full">
              <TabsTrigger value="config">Config</TabsTrigger>
              <TabsTrigger value="theme">Theme</TabsTrigger>
            </TabsList>

            <TabsContent value="config" className="space-y-4">
              {/* ConfigPanel/ThemeEditor own their heading + inset padding, so the
                  Card supplies only the surface (border/shadow), not extra padding. */}
              <Card>
                <CardContent className="p-0">
                  {def ? (
                    <ConfigPanel
                      definition={def}
                      overrides={configOverrides}
                      onChange={setConfigOverrides}
                    />
                  ) : (
                    <p className="p-3 text-sm text-muted-fg">Loading schema…</p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <EmbedSnippet slug={entry.slug} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="theme">
              <Card>
                <CardContent className="p-0">
                  <ThemeEditor overrides={tokenOverrides} onChange={setTokenOverrides} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </aside>
      </div>
    </div>
  );
}
