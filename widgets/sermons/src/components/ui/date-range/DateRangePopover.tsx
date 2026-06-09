/**
 * Self-contained popover shell for the DateRangePicker.
 *
 * Replaces the former dependency on the shared `Modal` component so the date
 * range picker owns its overlay. Like `Modal` it renders inline (NOT via a
 * portal) so it stays inside the widget shadow DOM, closes on Escape, focuses
 * the panel on open, and keeps a hand-rolled Tab loop trapped inside the panel
 * (jsdom does not run native Tab traversal, so the loop is intercepted here).
 */

import {
  useCallback,
  useEffect,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { cn } from '@perimeter/ui/utils/cn';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const sizeClasses = {
  sm: 'max-w-[400px]',
  lg: 'max-w-[640px]',
} as const;

interface DateRangePopoverProps {
  open: boolean;
  onClose: () => void;
  size?: keyof typeof sizeClasses;
  children?: ReactNode;
}

export function DateRangePopover({ open, onClose, size = 'sm', children }: DateRangePopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Focus the panel on open.
  useEffect(() => {
    if (open && panelRef.current) {
      panelRef.current.focus();
    }
  }, [open]);

  // Hand-rolled Tab loop: keep focus inside the panel.
  const handleKeyDown = useCallback((e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    if (focusable.length === 0) {
      e.preventDefault();
      panel.focus();
      return;
    }
    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    const active = document.activeElement;
    if (e.shiftKey) {
      if (active === first || active === panel) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (active === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1050] flex items-center justify-center"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative w-full rounded-xl border px-6 py-6 shadow-xl',
          'border-border bg-bg',
          sizeClasses[size],
        )}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {children}
      </div>
    </div>
  );
}
