import { useMemo } from 'react';
import { Link } from 'react-router';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { toComponentEntries, componentGlob } from '../lib/discovery';

/**
 * One index page for the whole `@perimeter/ui` library, replacing the long
 * per-component list that used to fill the sidebar. Names only, in columns —
 * the component docs are reference material you look up, not a section you
 * browse item by item, so the rail stays short and this page carries the index.
 *
 * Discovery is the same glob the sidebar used, so a new file in
 * packages/ui/src/ appears here with no wiring.
 */
export function ComponentsPage() {
  const components = useMemo(() => toComponentEntries(componentGlob), []);

  return (
    <div className="p-6">
      <Breadcrumbs crumbs={[{ label: 'Home', to: '/' }, { label: 'Components' }]} />
      <h1 className="mt-1 text-xl font-semibold tracking-tight text-fg">Components</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-fg">
        Every component in <span className="text-fg">@perimeter/ui</span>, the shadcn-based library
        the widgets are built from. Open one for its usage doc and live examples.
      </p>

      {components.length === 0 ? (
        <p className="mt-6 text-sm text-muted-fg">No components discovered.</p>
      ) : (
        <>
          <h2 className="mt-8 text-base font-semibold text-fg">
            All components <span className="font-normal text-muted-fg">({components.length})</span>
          </h2>
          {/* Columns rather than cards: the name is the only thing worth
              scanning here, and a card grid for 18 of them is a wall. */}
          <ul className="mt-4 grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
            {components.map((component) => (
              <li key={component.name}>
                <Link
                  to={`/components/${component.name}`}
                  className="block rounded-md py-1.5 text-sm text-fg transition-colors hover:text-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {component.name}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
