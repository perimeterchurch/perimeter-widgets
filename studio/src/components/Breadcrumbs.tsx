import { Fragment } from 'react';
import { Link } from 'react-router';

/** One crumb in the trail. A `to` makes it a link; the last (current) crumb omits it. */
export interface Crumb {
  label: string;
  to?: string;
}

/**
 * A small `Home / <section> / <name>` trail rendered above a page's heading. Pages
 * pass their own crumbs (driven from the route params) so the trail stays a dumb,
 * trivially-testable presenter — no route introspection here. The final crumb is the
 * current page and is rendered as plain text with `aria-current="page"`; earlier
 * crumbs are links. Wrapped in a labelled <nav> for assistive tech.
 */
export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-xs font-medium text-muted-fg">
      <ol className="flex flex-wrap items-center gap-1.5">
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <Fragment key={`${crumb.label}-${i}`}>
              <li>
                {crumb.to && !isLast ? (
                  <Link
                    to={crumb.to}
                    className="rounded-sm transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-fg" aria-current={isLast ? 'page' : undefined}>
                    {crumb.label}
                  </span>
                )}
              </li>
              {!isLast ? (
                <li aria-hidden="true" className="text-muted-fg/60">
                  /
                </li>
              ) : null}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
