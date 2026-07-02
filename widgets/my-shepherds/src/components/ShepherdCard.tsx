import * as React from 'react';
import { Card } from '@perimeter/ui/card';
import { Button } from '@perimeter/ui/button';
import { PhoneSolid, ChatSolid, MailSolid } from './icons';
import type { Shepherd } from '@perimeter/api-hooks';

/** `tel:`/`sms:` href — keep digits and a leading `+`, drop spaces and dashes. */
function dialDigits(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}

interface ContactActionProps {
  href: string | undefined;
  icon: React.ReactNode;
  label: string;
}

/**
 * A Call/Text/Email action. Renders as an anchor (so the host's native
 * dialer/SMS/mail handler fires) when the contact field exists, and degrades to
 * a real disabled `<button>` when it's missing — an anchor without an href has
 * no link role and isn't focusable, so a disabled button is the correct control.
 */
function ContactAction({ href, icon, label }: ContactActionProps): React.JSX.Element {
  const body = (
    <>
      <span className="mr-2 inline-flex" aria-hidden>
        {icon}
      </span>
      {label}
    </>
  );

  if (href === undefined) {
    return (
      <Button variant="primary" className="text-white shadow-md rounded-[4px] font-bold" disabled>
        {body}
      </Button>
    );
  }

  return (
    <Button
      variant="primary"
      className="text-white shadow-md rounded-[4px] font-bold"
      nativeButton={false}
      render={<a href={href} />}
    >
      {body}
    </Button>
  );
}

export function ShepherdCard({ shepherd }: { shepherd: Shepherd }): React.JSX.Element {
  const { Elder_Name, Elder_Type, Mobile_Phone, Email_Address, Elder_Photo_URL } = shepherd;

  return (
    <Card className="p-6 shadow-md">
      <div className="flex items-center gap-5">
        <img
          src={Elder_Photo_URL}
          alt={Elder_Name}
          loading="lazy"
          className="size-24 shrink-0 rounded-full bg-muted object-cover"
        />
        <div className="min-w-0">
          <h3 className="text-xl font-bold text-fg">{Elder_Name}</h3>
          <p className="mt-1 text-muted-fg">{Elder_Type}</p>
          {Mobile_Phone ? <p className="text-muted-fg">{Mobile_Phone}</p> : null}
          {Email_Address ? <p className="truncate text-muted-fg">{Email_Address}</p> : null}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <ContactAction
          href={Mobile_Phone ? `tel:${dialDigits(Mobile_Phone)}` : undefined}
          icon={<PhoneSolid className="size-4" />}
          label="Call"
        />
        <ContactAction
          href={Mobile_Phone ? `sms:${dialDigits(Mobile_Phone)}` : undefined}
          icon={<ChatSolid className="size-4" />}
          label="Text"
        />
        <ContactAction
          href={Email_Address ? `mailto:${Email_Address}` : undefined}
          icon={<MailSolid className="size-4" />}
          label="Email"
        />
      </div>
    </Card>
  );
}
