import * as React from 'react';
import { Input } from '@perimeter/ui/input';
import { Label } from '@perimeter/ui/label';
import type { AddressDraft, ContactDraft, GuestDetails } from '../lib/draft';

interface AddressFieldsProps {
  idPrefix: string;
  address: AddressDraft;
  required: boolean;
  onChange: (address: AddressDraft) => void;
}

function AddressFields({
  idPrefix,
  address,
  required,
  onChange,
}: AddressFieldsProps): React.JSX.Element {
  const set = (patch: Partial<AddressDraft>) => onChange({ ...address, ...patch });
  const star = required ? ' *' : '';
  return (
    <div className="grid gap-3">
      <div className="grid gap-1">
        <Label htmlFor={`${idPrefix}-line1`}>Address{star}</Label>
        <Input
          id={`${idPrefix}-line1`}
          value={address.line1}
          maxLength={75}
          autoComplete="address-line1"
          required={required}
          onChange={(e) => set({ line1: e.target.value })}
        />
      </div>
      <div className="grid gap-1">
        <Label htmlFor={`${idPrefix}-line2`}>Address line 2</Label>
        <Input
          id={`${idPrefix}-line2`}
          value={address.line2}
          maxLength={75}
          autoComplete="address-line2"
          onChange={(e) => set({ line2: e.target.value })}
        />
      </div>
      <div className="grid gap-3 @min-[480px]:grid-cols-3">
        <div className="grid gap-1">
          <Label htmlFor={`${idPrefix}-city`}>City{star}</Label>
          <Input
            id={`${idPrefix}-city`}
            value={address.city}
            maxLength={50}
            autoComplete="address-level2"
            required={required}
            onChange={(e) => set({ city: e.target.value })}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`${idPrefix}-state`}>State{star}</Label>
          <Input
            id={`${idPrefix}-state`}
            value={address.state}
            maxLength={50}
            autoComplete="address-level1"
            required={required}
            onChange={(e) => set({ state: e.target.value })}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`${idPrefix}-zip`}>ZIP{star}</Label>
          <Input
            id={`${idPrefix}-zip`}
            value={address.postalCode}
            maxLength={25}
            autoComplete="postal-code"
            required={required}
            onChange={(e) => set({ postalCode: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

export interface SignedInContactFormProps {
  contact: ContactDraft;
  addressRequired: boolean;
  /** The values differ from the MP record: offer to write them back. */
  dirty: boolean;
  onChange: (patch: Partial<ContactDraft>) => void;
}

/**
 * The signed-in purchaser's contact fields: pre-filled from MP, editable,
 * with the native "use this to update my record" opt-in shown once something
 * has actually changed. Address is required only when the quote says so.
 */
export function SignedInContactForm({
  contact,
  addressRequired,
  dirty,
  onChange,
}: SignedInContactFormProps): React.JSX.Element {
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 @min-[480px]:grid-cols-2">
        <div className="grid gap-1">
          <Label htmlFor="purchaser-email">Email *</Label>
          <Input
            id="purchaser-email"
            type="email"
            value={contact.email}
            maxLength={254}
            autoComplete="email"
            required
            onChange={(e) => onChange({ email: e.target.value })}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="purchaser-phone">Phone *</Label>
          <Input
            id="purchaser-phone"
            type="tel"
            value={contact.phone}
            maxLength={50}
            autoComplete="tel"
            required
            onChange={(e) => onChange({ phone: e.target.value })}
          />
        </div>
      </div>
      <AddressFields
        idPrefix="purchaser"
        address={contact.address}
        required={addressRequired}
        onChange={(address) => onChange({ address })}
      />
      {dirty && (
        <label
          htmlFor="purchaser-update-record"
          className="inline-flex min-h-11 cursor-pointer items-start gap-2 py-2 font-sans text-sm text-fg select-none"
        >
          <input
            id="purchaser-update-record"
            type="checkbox"
            checked={contact.updateMyRecord}
            onChange={(e) => onChange({ updateMyRecord: e.target.checked })}
            className="mt-0.5 size-4 shrink-0 cursor-pointer accent-primary"
          />
          Also update my record on file with these details.
        </label>
      )}
    </div>
  );
}

export interface GuestContactFormProps {
  guest: GuestDetails;
  addressRequired: boolean;
  onChange: (patch: Partial<GuestDetails>) => void;
  /** Distinct ids when the form appears in the editor and in the contact line at once. */
  idPrefix?: string;
}

/** The blank form for a visitor who is not signed in. */
export function GuestContactForm({
  guest,
  addressRequired,
  onChange,
  idPrefix = 'guest',
}: GuestContactFormProps): React.JSX.Element {
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 @min-[480px]:grid-cols-2">
        <div className="grid gap-1">
          <Label htmlFor={`${idPrefix}-first`}>First name *</Label>
          <Input
            id={`${idPrefix}-first`}
            value={guest.firstName}
            maxLength={50}
            autoComplete="given-name"
            required
            onChange={(e) => onChange({ firstName: e.target.value })}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`${idPrefix}-last`}>Last name *</Label>
          <Input
            id={`${idPrefix}-last`}
            value={guest.lastName}
            maxLength={50}
            autoComplete="family-name"
            required
            onChange={(e) => onChange({ lastName: e.target.value })}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`${idPrefix}-email`}>Email *</Label>
          <Input
            id={`${idPrefix}-email`}
            type="email"
            value={guest.email}
            maxLength={254}
            autoComplete="email"
            required
            onChange={(e) => onChange({ email: e.target.value })}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`${idPrefix}-phone`}>Phone *</Label>
          <Input
            id={`${idPrefix}-phone`}
            type="tel"
            value={guest.phone}
            maxLength={50}
            autoComplete="tel"
            required
            onChange={(e) => onChange({ phone: e.target.value })}
          />
        </div>
      </div>
      <AddressFields
        idPrefix={`${idPrefix}-address`}
        address={guest.address}
        required={addressRequired}
        onChange={(address) => onChange({ address })}
      />
    </div>
  );
}
