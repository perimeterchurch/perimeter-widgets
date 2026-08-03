import { useEffect, useState } from 'react';
import { NavLink } from 'react-router';
import { cn } from '@perimeter/ui/utils/cn';
import type { NavGroup } from '../lib/nav';

interface SidebarProps {
  nav: NavGroup[];
  /** Drawer state below `lg`. Owned by Layout so the header's menu button and
   * this rail agree; above `lg` the rail is always in-flow and this is inert. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * The persistent left rail, styled to match the Knowledge Base subsite's
 * AppSidebar: an 18rem column under the sticky header with grouped NavLinks as
 * rounded pills — the active one filled with the chrome accent rather than the
 * brand blue the studio used before.
 *
 * Active route styling comes from react-router's NavLink `aria-current="page"`.
 * Collapses below `lg` into an off-canvas drawer (the rail is hidden, not
 * unmounted, so search/scroll state survives), opened from the header's menu
 * button and dismissed by the scrim, Escape, or navigating.
 *
 * The brand lockup and the theme toggle used to live here; both moved to
 * AppHeader, where the KB puts them. A nav-filter box used to sit above the
 * groups; it was removed as unnecessary — the full nav fits in one scroll and
 * the KB's rail carries no filter either.
 */
export function Sidebar({ nav, open, onOpenChange }: SidebarProps) {
  // Below lg the rail is off-canvas (translate-only) when closed; at lg it is
  // always in-flow. When it is off-canvas-and-closed, take it out of the tab
  // order + a11y tree so keyboard/SR users can't reach the hidden menu (a
  // transform alone leaves it focusable). matchMedia is absent in tests → stays
  // interactive there, matching the lg/in-flow case.
  const offCanvasHidden = useBelowLg() && !open;

  // Escape closes the drawer — expected of any overlay, and the scrim alone
  // leaves keyboard users stuck.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => onOpenChange(false)}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}

      <aside
        id="studio-sidebar"
        aria-label="Primary"
        inert={offCanvasHidden || undefined}
        className={cn(
          'flex flex-col border-r border-chrome-border bg-chrome-card font-studio',
          // Off-canvas on small screens; in-flow and sticky under the 4rem
          // header on lg, matching the KB's md:sticky md:top-16 rail.
          'fixed inset-y-0 left-0 z-50 w-72 -translate-x-full transition-transform duration-200 ease-out',
          open && 'translate-x-0',
          'lg:sticky lg:top-16 lg:z-0 lg:h-[calc(100vh-4rem)] lg:translate-x-0',
        )}
      >
        <nav className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-4">
          <ul className="space-y-5">
            {nav.map((group) => (
              <li key={group.label}>
                {/* Sentence-case and full-size, as the KB labels "Categories"
                    — not the small uppercase eyebrow the studio used. */}
                <h2 className="px-1 pb-2 text-base font-semibold text-chrome-fg">{group.label}</h2>
                <ul className="flex flex-col gap-1">
                  {group.items.map((item) => (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        onClick={() => onOpenChange(false)}
                        className={({ isActive }) =>
                          cn(
                            // No `leading-none` here: at line-height 1 the line box
                            // is exactly the font size, so descenders (g, y, p)
                            // fall outside it and the `truncate` below —
                            // overflow: hidden — clips them. The row is a
                            // fixed h-10 with items-center, so normal leading
                            // costs no height.
                            'flex h-10 items-center gap-2.5 rounded-lg px-3 text-base transition-colors duration-150',
                            'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-chrome-primary/50',
                            isActive
                              ? 'bg-chrome-accent font-semibold text-chrome-accent-fg'
                              : 'font-medium text-chrome-pill-fg hover:bg-chrome-accent/60 hover:text-chrome-pill-hover-fg',
                          )
                        }
                      >
                        <span className="flex items-center gap-1.5 truncate">
                          {item.label}
                          {item.authRequired && (
                            <>
                              <LockIcon />
                              <span className="sr-only">Sign-in required</span>
                            </>
                          )}
                          {/* Not shipped to the CDN yet, so its page has no
                              Embed tab — say so here rather than let the
                              missing tab read as a bug. Local dev only. */}
                          {item.unreleased && (
                            <span className="shrink-0 text-xs font-normal text-chrome-muted-fg">
                              dev
                            </span>
                          )}
                        </span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
}

/**
 * True when the viewport is below the `lg` breakpoint (1024px), where the rail is
 * off-canvas. Returns false when `matchMedia` is unavailable (SSR / test env), so
 * the rail stays interactive — the same as the always-visible lg/in-flow case.
 */
function useBelowLg(): boolean {
  const [below, setBelow] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(max-width: 1023.98px)');
    const sync = () => setBelow(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return below;
}

/** Sign-in-required indicator on catalog items — the sibling sr-only text owns
 * the accessible name; the glyph mirrors the lucide lock paths. */
function LockIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0 opacity-70"
    >
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
