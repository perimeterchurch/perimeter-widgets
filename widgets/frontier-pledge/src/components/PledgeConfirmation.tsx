import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@perimeter/ui/button';
import { transitions } from '@perimeter/ui/lib/motion-config';

export interface PledgeConfirmationProps {
  open: boolean;
  onClose: () => void;
  /** Where a pledger can log in to see the pledge that was just recorded. */
  accountUrl: string;
}

const checkDraw = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: { duration: 0.8, ease: [0.4, 0, 0.2, 1] as const },
  },
};

/**
 * The pledge confirmation. Covers the form rather than replacing it so the
 * band keeps its height and the page does not jump under the reader at the
 * moment their pledge lands. The form beneath is made `inert` by the caller.
 */
export function PledgeConfirmation({
  open,
  onClose,
  accountUrl,
}: PledgeConfirmationProps): React.JSX.Element {
  const closeRef = React.useRef<HTMLButtonElement>(null);

  // Focus moves into the confirmation when it appears: the form behind it is
  // inert, so leaving focus there would strand a keyboard user.
  React.useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => closeRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="frontier-pledge-confirmation"
          role="status"
          aria-live="polite"
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-surface-dark px-4 text-center text-surface-dark-fg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={transitions.slow}
        >
          <Button
            ref={closeRef}
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close confirmation"
            className="absolute top-3 right-3 text-surface-dark-fg hover:bg-surface-dark-fg/10 hover:text-surface-dark-fg"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="size-5"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </Button>

          <motion.svg
            viewBox="0 0 60 60"
            width={70}
            height={70}
            initial="hidden"
            animate="visible"
            aria-hidden="true"
          >
            <motion.circle
              cx="30"
              cy="30"
              r="25"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.4 }}
            />
            <motion.path
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20 30l7 7 13-13"
              variants={checkDraw}
            />
          </motion.svg>

          <h3 className="font-serif text-2xl leading-tight font-normal text-balance @md:text-3xl">
            Thank you for your pledge to the Frontier Campaign!
          </h3>
          <p className="max-w-md text-base">
            To check your pledge, please log in to your{' '}
            <a href={accountUrl} className="underline underline-offset-4 hover:text-primary">
              My Perimeter
            </a>{' '}
            account.
          </p>
          <p className="max-w-md text-base">
            A confirmation has been sent to the email you provided.
          </p>

          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="mt-2 border-surface-dark-fg/40 bg-transparent text-surface-dark-fg hover:bg-surface-dark-fg/10 hover:text-surface-dark-fg"
          >
            Make another pledge
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
