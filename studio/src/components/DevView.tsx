import { useState } from 'react';
import type { WidgetDefinition } from '@perimeter/widget-runtime';
import type { WidgetEntry } from '../lib/discovery';
import { WidgetPreview } from './WidgetPreview';
import { Canvas } from './Canvas';
import { InspectorDrawer } from './InspectorDrawer';
import { ShareLinkButton } from './ShareLinkButton';
import { usePreviewConfig } from '../hooks/use-preview-config';
import { useChromeTheme } from '../lib/use-chrome-theme';

/**
 * The Dev tab: the widget mounted from SOURCE through the real `mount()` inside a
 * host-page-sim canvas (viewport presets, background, light/dark), beside the
 * Inspector (Config / Theme / Info + generated snippet) and a share/standalone
 * control. HMR applies here, which the Embed tab's shipped bundle cannot do.
 *
 * Local dev only — the deployed studio shows the Embed tab and the doc, matching
 * the old dev-only "Widget source" nav group this replaces.
 *
 * Preview state (config + token overrides + theme + viewport + background) lives
 * in the URL via usePreviewConfig, so a dialed-in preview is shareable and
 * survives reload; the standalone /preview/:slug route reads the same params.
 *
 * Previously the whole of WidgetPage at /widgets/:slug.
 */
export function DevView({ entry }: { entry: WidgetEntry }) {
  const { state, setConfig, setTokens, setTheme, setViewport, setBackground, buildShareUrl } =
    usePreviewConfig();
  const [def, setDef] = useState<WidgetDefinition | null>(null);

  // Follows the studio chrome toggle until the canvas Theme control pins one
  // explicitly; `state.theme` (the pinned value from the URL) wins when set.
  const chromeTheme = useChromeTheme();
  const previewTheme = state.theme ?? chromeTheme;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-2">
        <ShareLinkButton
          copyUrl={() => buildShareUrl(window.location.pathname)}
          standaloneUrl={buildShareUrl(`/preview/${entry.slug}`)}
        />
        <InspectorDrawer
          definition={def}
          slug={entry.slug}
          configOverrides={state.config}
          tokenOverrides={state.tokens}
          onConfigChange={setConfig}
          onThemeChange={setTokens}
        />
      </div>

      {/*
        A definite height rather than `h-full`: the Layout shell scrolls the
        DOCUMENT now (that is what the sticky header and rail hang off), so `main`
        has no definite height for a percentage to resolve against and `h-full`
        would collapse the canvas. 70vh matches the shipped-bundle iframe on the
        Embed tab, so switching tabs does not resize the page.
      */}
      <div className="h-[70vh] min-h-0 overflow-hidden rounded-md border border-border">
        <Canvas
          slug={entry.slug}
          theme={previewTheme}
          onThemeChange={setTheme}
          viewport={state.viewport}
          onViewportChange={setViewport}
          background={state.background}
          onBackgroundChange={setBackground}
        >
          <WidgetPreview
            entry={entry}
            configOverrides={state.config}
            tokenOverrides={state.tokens}
            theme={previewTheme}
            onDefinition={setDef}
          />
        </Canvas>
      </div>
    </div>
  );
}
