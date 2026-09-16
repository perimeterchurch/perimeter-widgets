import * as React from 'react';
import { Check, Pencil } from 'lucide-react';
import { Button } from '@perimeter/ui/button';

export interface ContactSummaryProps {
  ref?: React.Ref<HTMLElement>;
  /** The purchaser: the signed-in member, or the guest once they have given their name. */
  name: string;
  email: string;
  phone: string;
  /** Show the fields instead of the one-line summary. */
  editing: boolean;
  /** False while something required is still missing: the fields stay open. */
  canCollapse: boolean;
  onEdit: () => void;
  onDone: () => void;
  /** The contact fields (signed-in or guest form). */
  children: React.ReactNode;
}

/**
 * The purchaser contact for the registration. One line when the
 * record already has what the invoice needs; the fields only when the
 * visitor asks to edit them, or when email, phone or a required address is
 * missing. Deliberately not "Registering as…": this widget registers the
 * household, and the purchaser is usually not the one attending.
 */
export function ContactSummary({
  ref,
  name,
  email,
  phone,
  editing,
  canCollapse,
  onEdit,
  onDone,
  children,
}: ContactSummaryProps): React.JSX.Element {
  return (
    <section
      ref={ref}
      className="grid gap-3 border border-border bg-bg p-4 @min-[480px]:p-6"
      aria-label="Your contact information"
      data-slot="contact-summary"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="grid gap-0.5">
          <p className="font-sans text-2xs font-bold tracking-wide text-muted-fg uppercase">
            Contact for this registration
          </p>
          {!editing && (
            <div className="grid gap-0.5 font-sans text-sm text-fg">
              {name.trim() && <strong>{name}</strong>}
              <div className="flex flex-wrap gap-x-3">
                {email.trim() && <span>{email}</span>}
                {phone.trim() && <span>{phone}</span>}
              </div>
            </div>
          )}
        </div>
        {editing ? (
          canCollapse && (
            <Button type="button" variant="ghost" size="sm" onClick={onDone}>
              <Check aria-hidden className="mr-1 size-4" />
              Done
            </Button>
          )
        ) : (
          <Button type="button" variant="ghost" size="sm" onClick={onEdit}>
            <Pencil aria-hidden className="mr-1 size-4" />
            Edit
          </Button>
        )}
      </div>
      {editing && children}
    </section>
  );
}
