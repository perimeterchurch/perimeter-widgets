import * as React from 'react';
import { X } from 'lucide-react';

export interface EditorSheetProps {
  title: string;
  titleId: string;
  onClose: () => void;
  children: React.ReactNode;
}

// Shared across widget instances on one page: the host body's scroll is
// locked while any sheet is open and restored when the last one closes.
let lockCount = 0;
let previousOverflow = '';

function lockBody(): void {
  if (typeof document === 'undefined') return;
  if (lockCount === 0) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  lockCount += 1;
}

function unlockBody(): void {
  if (typeof document === 'undefined') return;
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) document.body.style.overflow = previousOverflow;
}

/**
 * The phone/tablet home of `RegistrantEditor`: a native `<dialog>` opened
 * with `showModal()`, so it sits in the browser's top layer — above the host
 * page's fixed header and immune to any `transform`/`overflow` ancestor the
 * host wraps the widget in — and the rest of the page is inert while it is
 * open. Mounted only while editing; unmounting closes it, unlocks the host
 * body and returns focus to the control that opened it.
 */
export function EditorSheet({
  title,
  titleId,
  onClose,
  children,
}: EditorSheetProps): React.JSX.Element {
  const ref = React.useRef<HTMLDialogElement>(null);
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const root = el.getRootNode() as Document | ShadowRoot;
    const opener = root.activeElement instanceof HTMLElement ? root.activeElement : null;

    const handleCancel = (e: Event) => {
      // Escape: keep the dialog under React's control instead of the UA closing it.
      e.preventDefault();
      onCloseRef.current();
    };
    const handleClose = () => onCloseRef.current();
    el.addEventListener('cancel', handleCancel);
    el.addEventListener('close', handleClose);

    if (!el.open) el.showModal();
    lockBody();
    el.focus();

    return () => {
      el.removeEventListener('cancel', handleCancel);
      el.removeEventListener('close', handleClose);
      if (el.open) el.close();
      unlockBody();
      if (opener && opener.isConnected) opener.focus();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      tabIndex={-1}
      data-slot="editor-sheet"
      className="fixed inset-x-0 top-auto bottom-0 m-0 max-h-[85dvh] w-full max-w-none border-0 bg-bg p-0 text-fg shadow-xl outline-hidden backdrop:bg-[rgb(0_0_0/0.4)] motion-safe:animate-in motion-safe:slide-in-from-bottom motion-safe:duration-200"
      onClick={(e) => {
        // A click on the backdrop lands on the dialog element itself.
        if (e.target === e.currentTarget) onCloseRef.current();
      }}
    >
      <div className="@container flex max-h-[85dvh] flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
          <h4 id={titleId} className="font-sans text-lg font-bold text-fg">
            {title}
          </h4>
          <button
            type="button"
            aria-label="Close"
            onClick={() => onCloseRef.current()}
            className="grid size-11 shrink-0 place-items-center text-fg hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4">
          {children}
        </div>
      </div>
    </dialog>
  );
}
