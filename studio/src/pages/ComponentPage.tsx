import { useMemo } from 'react';
import { useParams } from 'react-router';
import { toComponentEntries, componentGlob } from '../lib/discovery';
import { ComponentPreview } from '../components/ComponentPreview';
import { NotFoundPage } from './NotFoundPage';

/**
 * The component route: a discovered @perimeter/ui component previewed through the
 * shadow-DOM ComponentStage (parity-correct — same styling path a widget ships).
 * Task 11 adds the MDX-doc-or-gallery split; for now it always renders the gallery.
 * Unknown names render the 404 page.
 */
export function ComponentPage() {
  const { name } = useParams();
  const components = useMemo(() => toComponentEntries(componentGlob), []);
  const entry = name ? components.find((c) => c.name === name) : undefined;

  if (!entry) return <NotFoundPage />;

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border px-6 py-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">Component</p>
        <h1 className="mt-0.5 font-mono text-xl font-semibold tracking-tight text-fg">
          {entry.name}
        </h1>
      </header>
      <div className="flex-1 overflow-auto p-6">
        <ComponentPreview entry={entry} />
      </div>
    </div>
  );
}
