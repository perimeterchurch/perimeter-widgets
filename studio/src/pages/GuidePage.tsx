import { lazy, Suspense, useMemo, type ComponentType } from 'react';
import { useParams } from 'react-router';
import { Spinner } from '@perimeter/ui/spinner';
import { guideDoc } from '../lib/guide-docs';
import { StudioMDXProvider } from '../lib/mdx';
import { NotFoundPage } from './NotFoundPage';

/**
 * The guide route. Renders the authored MDX guide for `:slug` (its own `# Title`
 * heading + prose + live `<Example>` blocks) inside the studio's MDX provider.
 * Unknown slugs render the 404 page. Guides are single-sourced under
 * `docs/guides-mdx/*.mdx` — the same files Claude reads as markdown.
 */
export function GuidePage() {
  const { slug } = useParams();
  const guide = slug ? guideDoc(slug) : null;

  if (!guide) return <NotFoundPage />;
  return <GuideDoc loader={guide.load} />;
}

/**
 * Renders the lazily-loaded MDX guide inside the studio's MDX provider. The guide
 * is a separate async chunk, so Suspend with a centered spinner while it streams
 * in. The MDX file owns its own heading; `mx-auto max-w-3xl` gives it a
 * comfortable reading measure rather than full-bleed.
 */
function GuideDoc({ loader }: { loader: () => Promise<{ default: ComponentType }> }) {
  // `lazy` is keyed on the loader identity (one per guide slug) so React keeps a
  // stable element type across re-renders of the same guide.
  const Doc = useMemo(() => lazy(loader), [loader]);
  return (
    <div className="h-full overflow-auto">
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
    </div>
  );
}
