import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { transitions } from '@perimeter/ui/lib/motion-config';

export interface FieldErrorProps {
  id: string;
  message: string | undefined;
}

/**
 * A validation message under a field. The slot keeps its height whether or not
 * a message is showing, so the form never reflows as fields are validated —
 * on a form this short, a shifting submit button is the difference between
 * pledging and mis-clicking.
 */
export function FieldError({ id, message }: FieldErrorProps): React.JSX.Element {
  return (
    <div className="min-h-5">
      <AnimatePresence initial={false} mode="wait">
        {message && (
          <motion.p
            key={message}
            id={id}
            role="alert"
            className="text-sm text-destructive"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={transitions.fast}
          >
            {message}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
