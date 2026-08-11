import { Link } from 'react-router';
import { Button } from '@perimeter/ui/button';
import { useStudioTheme } from '../lib/use-studio-theme';
import { AccountMenu } from './AccountMenu';

/**
 * The studio's top bar, matching the Knowledge Base subsite's AppHeader: a
 * sticky 4rem row carrying the "Perimeter <subsite>" wordmark on the left and an
 * icon cluster on the right, over a hairline bottom border.
 *
 * Differences from the KB:
 *
 * - the site-level identity is optional — `AccountMenu` shows a sign-out only
 *   when the studio runs behind the Next auth shell (`studio-host`); in
 *   standalone dev/tests it renders nothing. (Widget-preview sign-in is a
 *   separate, per-widget concern that authorises a preview, not the site.)
 * - no search icon — the KB's returns you to a home hero that owns the search;
 *   the studio's search is a nav FILTER and belongs beside the nav it filters
 *
 * The mobile menu button lives here rather than in the Sidebar (which used to
 * own it) so it sits in the header row exactly as the KB's does. That is why the
 * drawer's open state is lifted to Layout.
 */
export function AppHeader({
  navOpen,
  onNavOpenChange,
}: {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
}) {
  const { theme, toggle } = useStudioTheme();

  return (
    <header className="sticky top-0 z-30 border-b border-chrome-border bg-chrome-bg">
      <div className="flex h-16 items-center gap-6 px-4 md:px-8">
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-expanded={navOpen}
            aria-controls="studio-sidebar"
            aria-label={navOpen ? 'Close navigation menu' : 'Open navigation menu'}
            onClick={() => onNavOpenChange(!navOpen)}
            className="-ml-1 size-9 p-0 text-chrome-fg lg:hidden"
          >
            {navOpen ? <CloseIcon /> : <MenuIcon />}
          </Button>
          <Link to="/" className="flex items-baseline gap-2">
            {/* Playfair for the brand word, Inter for the subsite name — the
                KB's lockup. `font-studio-serif` is scoped to this one span. */}
            <span className="font-studio-serif text-2xl font-medium tracking-tight text-chrome-fg">
              Perimeter
            </span>
            <span className="text-2xl font-light tracking-tight text-chrome-primary">Studio</span>
          </Link>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Chrome light/dark toggle — themes the studio shell only (via
              data-theme on documentElement). Independent of the widget-preview
              canvas theme control. Moved here from the sidebar to match the KB;
              the accessible name still contains "theme", which is how the
              visual suite's setStudioTheme() finds it. */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-pressed={theme === 'dark'}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title="Toggle theme"
            onClick={toggle}
            className="size-9 shrink-0 p-0 text-chrome-fg"
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </Button>
          {/* Site-level sign-out — only rendered behind the auth shell. */}
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}

/** Inline glyphs mirroring the lucide paths the KB uses — the studio carries no
 * icon dependency. `aria-hidden`; each Button owns the accessible name. */
function MenuIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      width="20"
      height="20"
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
      width="20"
      height="20"
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
