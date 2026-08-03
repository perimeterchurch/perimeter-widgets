import { useMemo, useState } from 'react';
import { Laptop, Smartphone, Tablet } from 'lucide-react';
import { Button } from '@perimeter/ui/button';
import { Card } from '@perimeter/ui/card';
import { useCopiedFlash } from '@perimeter/ui/hooks/use-copied-flash';
import type { CatalogEntry } from '../lib/catalog';
import { buildEmbedSnippet, type PreviewTheme } from '../lib/embed-snippet';
import { CdnBundlePreview } from './CdnBundlePreview';
import { MpLoginPanel } from './MpLoginPanel';
import { ConfigPanel } from './ConfigPanel';
import { useChromeTheme } from '../lib/use-chrome-theme';
import { VIEWPORT_WIDTHS } from '../lib/preview-link';

/**
 * The three device widths the Embed preview can be pinned to, as icon-only
 * buttons. Deliberately just these three — no "fluid" escape hatch — because
 * `desktop` already IS the full-width case: its 1280px is applied as a MAXIMUM
 * (see `maxWidth` below), so on a narrower studio pane it simply fills the space,
 * which is what the preview did before this control existed. That keeps the
 * default behavior unchanged while making phone and tablet one click away.
 */
const DEVICES = [
  { id: 'mobile', label: 'Phone', px: VIEWPORT_WIDTHS.mobile, Icon: Smartphone },
  { id: 'tablet', label: 'Tablet', px: VIEWPORT_WIDTHS.tablet, Icon: Tablet },
  { id: 'desktop', label: 'Desktop', px: VIEWPORT_WIDTHS.desktop, Icon: Laptop },
] as const;

type DeviceId = (typeof DEVICES)[number]['id'];

/**
 * The Embed tab: the SHIPPED bundle running live through the real
 * loader.js → manifest → immutable-bundle chain, the copyable snippet carrying the
 * identical attribute set as the preview, and the options playground under it. The
 * sign-in panel slots in above the embed for auth widgets.
 *
 * This is what a non-developer comes to the studio for — tune the options, copy
 * the snippet — which is why it is the default tab. It needs a released widget:
 * without a CDN entry there is no bundle to load, so the widget page offers the
 * Dev view alone in that case.
 *
 * Previously the whole of CatalogWidgetPage at /catalog/:slug.
 */
export function EmbedView({ entry }: { entry: CatalogEntry }) {
  const [overrides, setOverrides] = useState<Record<string, unknown>>({});
  // Preview theme follows the studio chrome until pinned by the local toggle;
  // ephemeral by design (not URL-persisted).
  const [pinnedTheme, setPinnedTheme] = useState<PreviewTheme | null>(null);
  const [device, setDevice] = useState<DeviceId>('desktop');
  const chromeTheme = useChromeTheme();
  const theme: PreviewTheme = pinnedTheme ?? chromeTheme;
  const snippet = useMemo(
    () => buildEmbedSnippet(entry.slug, overrides, theme),
    [entry.slug, overrides, theme],
  );
  const deviceWidth = DEVICES.find((d) => d.id === device)!.px;

  return (
    <div className="space-y-6">
      {entry.definition && entry.definition.auth !== 'none' && (
        <MpLoginPanel mode={entry.definition.auth} />
      )}

      <div>
        <DeviceToggle value={device} onChange={setDevice} />
        {/* `maxWidth` (not `width`) + `mx-auto`: the frame narrows to the device
            width and centers, but never exceeds the pane, so `desktop` degrades to
            "as wide as there is room" instead of forcing a horizontal scrollbar on
            a laptop screen. */}
        <div className="mx-auto w-full" style={{ maxWidth: `${deviceWidth}px` }}>
          <CdnBundlePreview slug={entry.slug} overrides={overrides} theme={theme} />
        </div>
      </div>

      {/* Snippet ABOVE the options, directly under the preview. The options list is
          as long as the widget's schema — community-group-finder has fifteen fields —
          so with the snippet last, the thing you actually came to copy sat off the
          bottom of the screen and moved further down the more you configured. It
          still updates live as the options change. */}
      <SnippetBlock snippet={snippet} />

      {entry.definition && (
        <Card data-testid="config-playground" className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-fg">Configure</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPinnedTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              Theme: {theme}
            </Button>
          </div>
          <ConfigPanel
            definition={entry.definition}
            overrides={overrides}
            onChange={setOverrides}
          />
        </Card>
      )}
    </div>
  );
}

/**
 * Icon-only phone / tablet / desktop buttons that resize the embed preview.
 *
 * Icon-only means the button has no text node, so each one carries an `aria-label`
 * (the accessible name) AND a `title` (the hover tooltip) — without them the
 * control is three unlabelled squares to a screen reader and a guess to everyone
 * else. `aria-pressed` rather than a `radiogroup`: these are toggle buttons over a
 * single preview, and `aria-pressed` is what conveys "this one is active" without
 * the arrow-key navigation contract a radiogroup promises.
 *
 * `aria-hidden` on the icons keeps the glyph out of the accessible name, leaving
 * the `aria-label` as the only thing announced.
 */
function DeviceToggle({
  value,
  onChange,
}: {
  value: DeviceId;
  onChange: (next: DeviceId) => void;
}) {
  return (
    // Centered, not right-aligned: the preview frame below is `mx-auto`, so
    // centering this row keeps the control over the middle of the widget at every
    // device width instead of drifting away from a narrowed frame.
    <div className="mb-2 flex items-center justify-center gap-1" aria-label="Preview width">
      {DEVICES.map(({ id, label, px, Icon }) => {
        const active = id === value;
        return (
          <Button
            key={id}
            type="button"
            size="icon"
            variant={active ? 'secondary' : 'ghost'}
            aria-pressed={active}
            aria-label={`${label} width (${px}px)`}
            title={`${label} — ${px}px`}
            onClick={() => onChange(id)}
          >
            <Icon aria-hidden="true" className="size-4" />
          </Button>
        );
      })}
    </div>
  );
}

function SnippetBlock({ snippet }: { snippet: string }) {
  const { copied, flash } = useCopiedFlash();
  const copy = () => {
    void navigator.clipboard?.writeText(snippet).then(flash);
  };
  return (
    <Card className="space-y-2 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-fg">Embed snippet</h2>
        <Button type="button" variant="outline" size="sm" onClick={copy}>
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <pre className="overflow-x-auto rounded-md bg-fg px-3 py-3 font-mono text-xs leading-relaxed text-bg">
        {snippet}
      </pre>
    </Card>
  );
}
