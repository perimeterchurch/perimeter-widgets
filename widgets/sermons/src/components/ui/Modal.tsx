/**
 * Lightweight Modal for widget-sermons.
 * Renders inline (not via portal) to stay inside the shadow DOM.
 * Uses a simple fixed overlay approach instead of Headless UI Dialog
 * which portals to document.body (outside shadow DOM).
 */

import {
  useCallback,
  useEffect,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { X } from 'lucide-react';
import { cn } from '@perimeter/ui/utils/cn';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

interface ModalProps {
  open: boolean;
  onClose: () => void;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  title?: string;
  className?: string;
  children?: ReactNode;
}

const sizeClasses = {
  sm: 'max-w-[400px]',
  md: 'max-w-[480px]',
  lg: 'max-w-[640px]',
  xl: 'max-w-[800px]',
} as const;

export function Modal({ open, onClose, size = 'md', title, className, children }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Focus trap — focus the panel on open
  useEffect(() => {
    if (open && panelRef.current) {
      panelRef.current.focus();
    }
  }, [open]);

  // Hand-rolled Tab loop: keep focus inside the panel. jsdom doesn't run native
  // Tab traversal, so we intercept Tab and wrap last→first / first→last.
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
        aria-label={title}
        className={cn(
          'relative w-full rounded-xl border px-6 py-6 shadow-xl',
          'border-[var(--color-border)] bg-[var(--color-bg)]',
          sizeClasses[size],
          className,
        )}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {title && (
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-[var(--color-fg)]">{title}</h3>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-[var(--color-muted-fg)] hover:text-[var(--color-fg)]"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

interface ModalFooterProps {
  children: ReactNode;
  className?: string;
}

export function ModalFooter({ children, className }: ModalFooterProps) {
  return (
    <div
      className={cn(
        'mt-6 flex items-center justify-end gap-3 border-t pt-6',
        'border-[var(--color-border)]',
        className,
      )}
    >
      {children}
    </div>
  );
}
