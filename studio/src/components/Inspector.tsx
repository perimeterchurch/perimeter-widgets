import { useState } from 'react';
import type { WidgetDefinition } from '@perimeter/widget-runtime';
import { Card, CardContent } from '@perimeter/ui/card';
import { Button } from '@perimeter/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@perimeter/ui/tabs';
import { ConfigPanel } from './ConfigPanel';
import { ThemeEditor } from './ThemeEditor';
import { InfoPanel } from './InfoPanel';

interface Props {
  /** The loaded widget definition (null while its module is still loading). */
  definition: WidgetDefinition | null;
  /** Widget slug — drives the production embed snippet. */
  slug: string;
  configOverrides: Record<string, unknown>;
  tokenOverrides: Record<string, string>;
  onConfigChange: (next: Record<string, unknown>) => void;
  onThemeChange: (next: Record<string, string>) => void;
}

/**
 * Build the production embed snippet for a widget. This is the canonical CDN
 * host/path a host page (WordPress) uses — keep it byte-for-byte in sync with
 * docs/hosting-and-release.md and the WidgetPage test, which asserts it exactly.
 */
export function embedSnippet(slug: string): string {
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
 * The widget inspector: three tabs built from the @perimeter/ui value-based Tabs
 * compound (Base UI — `defaultValue` + matching `value` per Trigger/Content, NOT
 * a Radix index/onChange API). Config = ConfigPanel + embed snippet; Theme =
 * ThemeEditor (with reset); Info = the read-only InfoPanel reference. ConfigPanel
 * and ThemeEditor own their heading + inset padding, so each Card supplies only
 * the surface (border/shadow), not extra padding.
 */
export function Inspector({
  definition,
  slug,
  configOverrides,
  tokenOverrides,
  onConfigChange,
  onThemeChange,
}: Props) {
  return (
    <Tabs defaultValue="config" className="gap-4">
      <TabsList className="w-full">
        <TabsTrigger value="config">Config</TabsTrigger>
        <TabsTrigger value="theme">Theme</TabsTrigger>
        <TabsTrigger value="info">Info</TabsTrigger>
      </TabsList>

      <TabsContent value="config" className="space-y-4">
        <Card>
          <CardContent className="p-0">
            {definition ? (
              <ConfigPanel
                definition={definition}
                overrides={configOverrides}
                onChange={onConfigChange}
              />
            ) : (
              <p className="p-3 text-sm text-muted-fg">Loading schema…</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <EmbedSnippet slug={slug} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="theme">
        <Card>
          <CardContent className="p-0">
            <ThemeEditor overrides={tokenOverrides} onChange={onThemeChange} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="info" className="space-y-4">
        <Card>
          <CardContent className="p-0">
            {definition ? (
              <InfoPanel definition={definition} />
            ) : (
              <p className="p-3 text-sm text-muted-fg">Loading schema…</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <EmbedSnippet slug={slug} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
