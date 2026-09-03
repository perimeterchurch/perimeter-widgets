import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@perimeter/ui/button';
import { Input } from '@perimeter/ui/input';
import { Label } from '@perimeter/ui/label';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@perimeter/ui/input-group';
import { Spinner } from '@perimeter/ui/spinner';
import { transitions } from '@perimeter/ui/lib/motion-config';
import { cn } from '@perimeter/ui/utils/cn';
import { FieldError } from './FieldError';
import type { PledgeFormErrors, PledgeFormValues } from '../types';
import { formatAmount, parseAmount } from '../lib/pledge';

export interface PledgeFormProps {
  values: PledgeFormValues;
  errors: PledgeFormErrors;
  onChange: (field: keyof PledgeFormValues, value: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  /** Set when the last submit attempt failed at the API. */
  submitFailed: boolean;
  onDismissSubmitError: () => void;
  amountLabel: string;
  /** Hidden from assistive tech and un-focusable while the confirmation covers it. */
  inert: boolean;
}

/** Labels are white on the widget's navy band, not the default `text-fg` navy. */
const LABEL = 'text-surface-dark-fg';
/** Every control sits on white so the fields read as inputs against the band. */
const FIELD = 'h-12 bg-bg text-base';

export function PledgeForm({
  values,
  errors,
  onChange,
  onSubmit,
  submitting,
  submitFailed,
  onDismissSubmitError,
  amountLabel,
  inert,
}: PledgeFormProps): React.JSX.Element {
  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form
      onSubmit={handleSubmit}
      // `noValidate`: the fields are validated in src/lib/pledge.ts so the
      // messages render on the band in brand type, rather than in a native
      // bubble anchored to a white-on-navy input.
      noValidate
      inert={inert}
      className="flex w-full flex-col items-center gap-5"
    >
      <div className="grid w-full max-w-md gap-x-4 @lg:max-w-xl @lg:grid-cols-2">
        <Field
          id="frontier-pledge-first-name"
          label="First Name"
          value={values.firstName}
          error={errors.firstName}
          autoComplete="given-name"
          onChange={(v) => onChange('firstName', v)}
        />
        <Field
          id="frontier-pledge-spouse"
          label="Spouse Name (Optional)"
          value={values.spouse}
          error={errors.spouse}
          autoComplete="off"
          onChange={(v) => onChange('spouse', v)}
        />
      </div>

      <div className="grid w-full max-w-md gap-0 @lg:max-w-xl">
        <Field
          id="frontier-pledge-last-name"
          label="Last Name"
          value={values.lastName}
          error={errors.lastName}
          autoComplete="family-name"
          onChange={(v) => onChange('lastName', v)}
        />
        <Field
          id="frontier-pledge-email"
          label="Email"
          type="email"
          value={values.email}
          error={errors.email}
          autoComplete="email"
          onChange={(v) => onChange('email', v)}
        />
        <Field
          id="frontier-pledge-phone"
          label="Mobile"
          type="tel"
          value={values.phone}
          error={errors.phone}
          autoComplete="tel"
          onChange={(v) => onChange('phone', v)}
        />
      </div>

      <div className="w-full max-w-md @lg:max-w-xl">
        <Label htmlFor="frontier-pledge-amount" className={cn(LABEL, 'mb-1 block font-bold')}>
          {amountLabel}
        </Label>
        <InputGroup
          className={cn(
            'h-12 bg-bg',
            errors.amount && 'border-destructive focus-within:ring-destructive/50',
          )}
        >
          <InputGroupAddon>
            <span className="text-lg text-muted-fg" aria-hidden="true">
              $
            </span>
          </InputGroupAddon>
          <InputGroupInput
            id="frontier-pledge-amount"
            inputMode="decimal"
            placeholder="0"
            maxLength={15}
            className="text-base"
            aria-invalid={Boolean(errors.amount)}
            aria-describedby={errors.amount ? 'frontier-pledge-amount-error' : undefined}
            value={values.amount}
            onChange={(e) => onChange('amount', e.target.value)}
            // Group the amount when the field is left, and ungroup it on the way
            // back in so the separators never have to be edited around.
            onBlur={(e) => {
              const parsed = parseAmount(e.target.value);
              onChange('amount', parsed === null ? '' : formatAmount(parsed));
            }}
            onFocus={(e) => onChange('amount', e.target.value.replace(/,/g, ''))}
          />
        </InputGroup>
        <FieldError id="frontier-pledge-amount-error" message={errors.amount} />
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={submitting}
        aria-busy={submitting}
        // The campaign CTA is the brand amber with navy text — `warning` is the
        // token that carries that pairing (7.8:1), and `primary` is the light
        // sky-blue used for ordinary widget actions.
        className="h-auto w-full max-w-md px-8 py-3 text-lg font-semibold bg-warning text-warning-fg hover:bg-warning/90 @lg:w-auto"
      >
        {submitting && <Spinner className="mr-2 size-5" />}
        {submitting ? 'Submitting…' : 'Make Pledge'}
      </Button>

      {/* Fixed-height slot: a submit failure must not push the button up. */}
      <div className="min-h-11 w-full max-w-md @lg:max-w-xl" aria-live="polite">
        <AnimatePresence initial={false} mode="wait">
          {submitFailed && (
            <motion.div
              key="submit-error"
              role="alert"
              className="flex items-center justify-between gap-2"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={transitions.fast}
            >
              <p className="text-sm text-destructive">Error submitting pledge. Please try again.</p>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={onDismissSubmitError}
                aria-label="Dismiss error"
                className="shrink-0 text-destructive hover:bg-surface-dark-fg/10 hover:text-destructive"
              >
                <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4">
                  <path
                    d="M6.2 6.2a1 1 0 0 1 1.4 0L10 8.6l2.4-2.4a1 1 0 1 1 1.4 1.4L11.4 10l2.4 2.4a1 1 0 1 1-1.4 1.4L10 11.4l-2.4 2.4a1 1 0 1 1-1.4-1.4L8.6 10 6.2 7.6a1 1 0 0 1 0-1.4Z"
                    fill="currentColor"
                  />
                </svg>
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </form>
  );
}

interface FieldProps {
  id: string;
  label: string;
  value: string;
  error: string | undefined;
  type?: string;
  autoComplete: string;
  onChange: (value: string) => void;
}

function Field({
  id,
  label,
  value,
  error,
  type = 'text',
  autoComplete,
  onChange,
}: FieldProps): React.JSX.Element {
  return (
    <div>
      <Label htmlFor={id} className={cn(LABEL, 'mb-1 block')}>
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(FIELD, error && 'border-destructive')}
        onChange={(e) => onChange(e.target.value)}
      />
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}
