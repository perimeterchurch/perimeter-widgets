import { useMemo, useState } from 'react';
import { NavLink } from 'react-router';
import { Input } from '@perimeter/ui/input';
import { Button } from '@perimeter/ui/button';
import { cn } from '@perimeter/ui/utils/cn';
import type { NavGroup } from '../lib/nav';
import { useStudioTheme } from '../lib/use-studio-theme';

interface SidebarProps {
  nav: NavGroup[];
}

/**
 * The persistent left rail: brand, a search box that filters nav items by label
 * (case-insensitive), and grouped NavLinks. Active route styling comes from
 * react-router's NavLink `aria-current="page"` plus a token-palette active state.
 * Collapses on narrow viewports behind a toggle (the rail is hidden, not unmounted,
 * so search/scroll state survives).
 */
export function Sidebar({ nav }: SidebarProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const { theme, toggle } = useStudioTheme();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return nav;
    return nav
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => item.label.toLowerCase().includes(q)),
      }))
      .filter((group) => group.items.length > 0);
  }, [nav, query]);

  const hasMatches = filtered.length > 0;

  return (
    <>
      {/* Mobile toggle — sits above the rail; hidden once the lg grid takes over. */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-expanded={open}
        aria-controls="studio-sidebar"
        onClick={() => setOpen((v) => !v)}
        className="fixed left-3 top-3 z-30 lg:hidden"
      >
        {open ? 'Close' : 'Menu'}
      </Button>

      <aside
        id="studio-sidebar"
        className={cn(
          'flex h-screen flex-col border-r border-border bg-bg font-sans',
          // Off-canvas on small screens, in-flow on lg.
          'fixed inset-y-0 left-0 z-20 w-64 -translate-x-full transition-transform duration-200',
          open && 'translate-x-0 shadow-lg',
          'lg:static lg:z-auto lg:translate-x-0 lg:shadow-none',
        )}
      >
        <div className="border-b border-border px-4 pb-3 pt-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold tracking-tight text-fg">Perimeter</span>
              <span className="text-xs font-medium uppercase tracking-wider text-muted-fg">
                Studio
              </span>
            </div>
            {/* Chrome light/dark toggle — themes the studio shell only (via
                data-theme on documentElement). Independent of the preview
                canvas theme control. */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-pressed={theme === 'dark'}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              title="Toggle theme"
              onClick={toggle}
              className="size-7 shrink-0 p-0 text-muted-fg"
            >
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </Button>
          </div>
          <div className="mt-3">
            <Input
              type="search"
              aria-label="Filter navigation"
              placeholder="Search…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-8"
            />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {hasMatches ? (
            <ul className="space-y-5">
              {filtered.map((group) => (
                <li key={group.label}>
                  <h2 className="px-2 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-fg">
                    {group.label}
                  </h2>
                  <ul className="space-y-0.5">
                    {group.items.map((item) => (
                      <li key={item.to}>
                        <NavLink
                          to={item.to}
                          onClick={() => setOpen(false)}
                          className={({ isActive }) =>
                            cn(
                              'block rounded-md px-2 py-1.5 text-sm transition-colors',
                              'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                              isActive
                                ? 'bg-primary font-medium text-primary-fg hover:bg-primary'
                                : 'text-fg',
                            )
                          }
                        >
                          {item.label}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-2 py-3">
              <p className="text-sm text-muted-fg">No matches for “{query.trim()}”.</p>
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={() => setQuery('')}
                className="mt-1 h-auto p-0 text-sm"
              >
                Clear search
              </Button>
            </div>
          )}
        </nav>
      </aside>
    </>
  );
}

/** Inline sun/moon glyphs — the studio carries no icon dependency, so these
 * mirror the lucide sun/moon paths. `aria-hidden` (the Button owns the label). */
function SunIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}
