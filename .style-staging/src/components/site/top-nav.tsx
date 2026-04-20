import Link from "next/link";

import { SearchTrigger } from "./search-trigger";
import { ThemeSwitcher } from "./theme-switcher";
import { ModeToggle } from "./mode-toggle";

const NAV_LINKS = [
  { href: "/components", label: "Components" },
  { href: "/templates", label: "Templates" },
  { href: "/tokens", label: "Tokens" },
  { href: "/docs/getting-started", label: "Getting Started" },
  { href: "/changelog", label: "Changelog" },
] as const;

export function TopNav() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
      <div className="flex h-14 items-center gap-6 px-6">
        <Link href="/" className="flex items-center gap-2 font-bold">
          Perimeter Style
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <SearchTrigger />
          <ThemeSwitcher />
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
