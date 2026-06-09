import { useEffect, useRef, useState } from 'react';
import type { WidgetDefinition } from '@perimeter/widget-runtime';
import { Button } from '@perimeter/ui/button';
import { Inspector } from './Inspector';

interface Props {
  /** The loaded widget definition (null while its module is still loading). */
  definition: WidgetDefinition | null;
  /** Widget slug — drives the production embed snippet. */
  slug: string;
  configOverrides: Record<string, unknown>;
  tokenOverrides: Record<string, string>;
  onConfigChange: (next: Record<string, unknown>) => void;
  onThemeChange: (next: Record<string, string>) => void;
}

/**
 * The inspector as a hand-rolled slide-out overlay drawer (Phase C). `@perimeter/ui`
 * has no Dialog/Drawer/Sheet primitive — only Tabs is wrapped — so every dialog
 * behaviour is explicit here: closed by default; a toggle button (accessible name
 * "Inspector") opens a right-side panel that slides over the preview with a
 * semi-transparent backdrop; backdrop-click, a close button, and an Escape keydown
 * all dismiss it; focus moves into the panel on open and is trapped within it
 * while open (Tab/Shift+Tab wrap), returning to the toggle on close. The panel is
 * `role="dialog"` + `aria-modal` + `aria-label`, and scrolls its own content
 * (`overflow-y-auto`). Inside, the Config/Theme/Info tabs stack vertically with
 * comfortable width — the canvas owns the full width when the drawer is closed.
 */
export function InspectorDrawer({
  definition,
  slug,
  configOverrides,
  tokenOverrides,
  onConfigChange,
  onThemeChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Escape closes the drawer. Added explicitly because no primitive backs it.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  // aria-modal contract: move focus INTO the panel on open and keep Tab within it
  // while open (no @perimeter/ui Dialog primitive backs this, so the trap is
  // explicit). Without this, focus stays on the toggle behind the backdrop and a
  // keyboard/SR user can tab into the obscured page underneath.
  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusables = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
    // Initial focus: the first focusable in the panel (the Close button).
    focusables()[0]?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !dialog.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !dialog.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  // Return focus to the toggle after the drawer closes (focus would otherwise be
  // lost on the removed panel/backdrop). Skip the initial closed render.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !open) toggleRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  return (
    <>
      <Button
        ref={toggleRef}
        type="button"
        variant="outline"
        size="sm"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        Inspector
      </Button>

      {open && (
        <>
          {/* Backdrop — semi-transparent scrim over the preview; click dismisses. */}
          <div
            data-inspector-backdrop
            className="fixed inset-0 z-40 bg-fg/30"
            onClick={() => setOpen(false)}
          />
          {/* Panel — fixed right-side drawer, full height, scrollable content. */}
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Widget inspector"
            className="fixed inset-y-0 right-0 z-50 flex w-[36rem] max-w-[92vw] flex-col border-l border-border bg-bg shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="text-sm font-semibold tracking-tight text-fg">Inspector</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Close inspector"
                onClick={() => setOpen(false)}
              >
                Close
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <Inspector
                definition={definition}
                slug={slug}
                configOverrides={configOverrides}
                tokenOverrides={tokenOverrides}
                onConfigChange={onConfigChange}
                onThemeChange={onThemeChange}
              />
            </div>
          </div>
        </>
      )}
    </>
  );
}
