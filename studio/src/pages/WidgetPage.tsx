import { lazy, Suspense, useMemo, useState, type ComponentType } from 'react';
import { useParams } from 'react-router';
import type { WidgetDefinition } from '@perimeter/widget-runtime';
import { Spinner } from '@perimeter/ui/spinner';
import { toWidgetEntries, widgetDefGlob, widgetCssGlob, type WidgetEntry } from '../lib/discovery';
import { widgetDoc } from '../lib/widget-docs';
import { StudioMDXProvider } from '../lib/mdx';
import { WidgetPreview } from '../components/WidgetPreview';
import { Canvas } from '../components/Canvas';
import { InspectorDrawer } from '../components/InspectorDrawer';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { ShareLinkButton } from '../components/ShareLinkButton';
import { usePreviewConfig } from '../hooks/use-preview-config';
import { useChromeTheme } from '../lib/use-chrome-theme';
import { titleFromSlug } from '../lib/labels';
import { NotFoundPage } from './NotFoundPage';

/**
 * The widget route: a host-page-sim canvas mounting the widget through the real
 * mount() (parity with production), beside the Inspector (Config / Theme / Info
 * tabs + the generated embed snippet). Unknown slugs render the 404 page.
 */
export function WidgetPage() {
  const { slug } = useParams();
  const widgets = useMemo(() => toWidgetEntries(widgetDefGlob, widgetCssGlob), []);
  const entry = slug ? widgets.find((w) => w.slug === slug) : undefined;

  if (!entry) return <NotFoundPage />;
  return <WidgetView key={entry.slug} entry={entry} />;
}

function WidgetView({ entry }: { entry: WidgetEntry }) {
  // The preview's tuned state (config overrides + token overrides + theme +
  // viewport) lives in the URL so a dialed-in preview is shareable and survives
  // reload — usePreviewConfig is the single source of truth, replacing local
  // useState. The standalone /preview/:slug route reads the same params.
  const { state, setConfig, setTokens, setTheme, setViewport, setBackground, buildShareUrl } =
    usePreviewConfig();
  const [def, setDef] = useState<WidgetDefinition | null>(null);
  const doc = widgetDoc(entry.slug);

  // The preview theme follows the studio chrome (sidebar) toggle until the canvas
  // Theme control pins one explicitly — so switching the studio to dark also
  // darkens the widget preview, matching the gallery stage. `state.theme` (the
  // pinned value from the URL) wins when set.
  const chromeTheme = useChromeTheme();
  const previewTheme = state.theme ?? chromeTheme;

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
        <div>
          <Breadcrumbs
            crumbs={[
              { label: 'Home', to: '/' },
              { label: 'Widgets' },
              { label: titleFromSlug(entry.slug) },
            ]}
          />
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-fg">
            {titleFromSlug(entry.slug)}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Share / standalone — copy a deep link carrying the current preview
              state, or open the full-bleed /preview/:slug route in a new tab. */}
          <ShareLinkButton
            copyUrl={() => buildShareUrl(window.location.pathname)}
            standaloneUrl={buildShareUrl(`/preview/${entry.slug}`)}
          />
          {/* Inspector — hand-rolled slide-out drawer (Config / Theme / Info tabs +
              embed snippet), closed by default. Its toggle lives in the header; the
              canvas keeps the full width when the drawer is closed. */}
          <InspectorDrawer
            definition={def}
            slug={entry.slug}
            configOverrides={state.config}
            tokenOverrides={state.tokens}
            onConfigChange={setConfig}
            onThemeChange={setTokens}
          />
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden">
        {/* Preview canvas — viewport-preset + background + light/dark toolbar around
            the real mount(). Canvas owns the scroll/background and swaps in the
            host-page sim (HostFrame) when its host-sim background is selected
            (the default). Theme + viewport are lifted into the URL here so they
            drive both the toolbar controls and the shareable preview link. */}
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

      {/* Optional widget doc: rendered below the canvas when docs/widgets/<slug>.mdx
          exists — purpose, config reference, embed instructions. Nothing otherwise. */}
      {doc ? (
        <section className="border-t border-border">
          <WidgetDoc loader={doc} />
        </section>
      ) : null}
    </div>
  );
}

/**
 * Renders the lazily-loaded per-widget MDX doc inside the studio's MDX provider,
 * matching the guide/component doc treatment (own heading, comfortable measure,
 * Suspense spinner while the async chunk streams in).
 */
function WidgetDoc({ loader }: { loader: () => Promise<{ default: ComponentType }> }) {
  const Doc = useMemo(() => lazy(loader), [loader]);
  return (
    <StudioMDXProvider>
      <article className="mx-auto max-w-3xl px-6 py-10">
        <Suspense
          fallback={
            <div className="flex justify-center py-16 text-muted-fg">
              <Spinner />
            </div>
          }
        >
          <Doc />
        </Suspense>
      </article>
    </StudioMDXProvider>
  );
}
