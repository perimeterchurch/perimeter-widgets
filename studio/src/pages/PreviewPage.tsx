import { useMemo, useState } from 'react';
import { useParams } from 'react-router';
import type { WidgetDefinition } from '@perimeter/widget-runtime';
import { toWidgetEntries, widgetDefGlob, widgetCssGlob } from '../lib/discovery';
import { WidgetPreview } from '../components/WidgetPreview';
import { usePreviewConfig } from '../hooks/use-preview-config';
import { NotFoundPage } from './NotFoundPage';

const PRESET_PX: Record<string, number | null> = {
  mobile: 375,
  tablet: 768,
  desktop: 1280,
  fluid: null,
};

/**
 * The standalone, full-bleed preview route (/preview/:slug). It renders ONLY the
 * widget mount — no studio chrome, no inspector, no canvas toolbar — reading the
 * exact same shareable params (config + tokens + theme + viewport) as the studio
 * widget route via usePreviewConfig. This is the target of the inspector's "Open
 * standalone" affordance: a clean surface for sharing, screenshotting, or
 * embedding-in-an-iframe inspection. Stays within the SPA (no extra Vercel config).
 */
export function PreviewPage() {
  const { slug } = useParams();
  const widgets = useMemo(() => toWidgetEntries(widgetDefGlob, widgetCssGlob), []);
  const entry = slug ? widgets.find((w) => w.slug === slug) : undefined;
  const { state } = usePreviewConfig();
  const [, setDef] = useState<WidgetDefinition | null>(null);

  if (!entry) return <NotFoundPage />;

  const widthPx =
    typeof state.viewport === 'object' ? state.viewport.custom : PRESET_PX[state.viewport];
  const width = widthPx == null ? undefined : `${widthPx}px`;

  return (
    <div className="min-h-screen w-full overflow-auto bg-bg p-6" data-standalone-preview>
      <div style={{ width, marginInline: 'auto' }} data-preview-frame>
        <WidgetPreview
          entry={entry}
          configOverrides={state.config}
          tokenOverrides={state.tokens}
          theme={state.theme}
          onDefinition={setDef}
        />
      </div>
    </div>
  );
}
