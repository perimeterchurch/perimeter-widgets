import { lazy, Suspense, useMemo, type ComponentType } from 'react';
import { useParams } from 'react-router';
import { Spinner } from '@perimeter/ui/spinner';
import { toComponentEntries, componentGlob, type ComponentEntry } from '../lib/discovery';
import { componentDoc } from '../lib/component-docs';
import { ComponentPreview } from '../components/ComponentPreview';
import { StudioMDXProvider } from '../lib/mdx';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { NotFoundPage } from './NotFoundPage';

/**
 * The component route. If `docs/components/<name>.mdx` exists, render that doc
 * (its own `# Title` heading + live examples mounted through the shadow-DOM
 * ComponentStage); otherwise fall back to the auto gallery under a labeled chrome
 * header — still parity-correct via ComponentStage. The doc set is derived from
 * discovery + the glob, never hard-coded, so docs land incrementally across the
 * @perimeter/ui components. Unknown names render 404.
 */
export function ComponentPage() {
  const { name } = useParams();
  const components = useMemo(() => toComponentEntries(componentGlob), []);
  const entry = name ? components.find((c) => c.name === name) : undefined;

  if (!entry) return <NotFoundPage />;

  const doc = componentDoc(entry.name);
  return doc ? <ComponentDoc name={entry.name} loader={doc} /> : <Gallery entry={entry} />;
}

/**
 * Renders the lazily-loaded MDX doc inside the studio's MDX provider. The doc is a
 * separate async chunk, so Suspend with a centered spinner while it streams in.
 * The MDX file owns its own heading; `mx-auto max-w-3xl` gives it a comfortable
 * reading measure rather than full-bleed.
 */
function ComponentDoc({
  name,
  loader,
}: {
  name: string;
  loader: () => Promise<{ default: ComponentType }>;
}) {
  // `lazy` is keyed on the loader identity (one per component name) so React keeps
  // a stable element type across re-renders of the same doc.
  const Doc = useMemo(() => lazy(loader), [loader]);
  return (
    <div className="h-full overflow-auto">
      <StudioMDXProvider>
        <article className="mx-auto max-w-3xl px-6 py-10">
          <div className="mb-4">
            <Breadcrumbs
              crumbs={[
                { label: 'Home', to: '/' },
                { label: 'Components', to: '/components' },
                { label: name },
              ]}
            />
          </div>
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
    </div>
  );
}

/**
 * The undocumented-component fallback: a labeled chrome header (the gallery has no
 * title of its own) above the auto gallery of discovered exports.
 */
function Gallery({ entry }: { entry: ComponentEntry }) {
  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border px-6 py-4">
        <Breadcrumbs
          crumbs={[
            { label: 'Home', to: '/' },
            { label: 'Components', to: '/components' },
            { label: entry.name },
          ]}
        />
        <h1 className="mt-1 font-mono text-xl font-semibold tracking-tight text-fg">
          {entry.name}
        </h1>
      </header>
      <div className="flex-1 overflow-auto p-6">
        <ComponentPreview entry={entry} />
      </div>
    </div>
  );
}
