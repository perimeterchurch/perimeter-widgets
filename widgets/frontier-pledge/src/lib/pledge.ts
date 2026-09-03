import type { PledgeFormErrors, PledgeFormValues } from '../types';

/** Anything that isn't a digit or a decimal point — thousands separators, a
 * typed "$", stray spaces. Stripped before the amount is parsed. */
const NON_NUMERIC = /[^0-9.]/g;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^[0-9+\s()-]{8,15}$/;

/** Blank form values — also what "Make another pledge" resets to. */
export const emptyPledgeForm: PledgeFormValues = {
  firstName: '',
  spouse: '',
  lastName: '',
  email: '',
  phone: '',
  amount: '',
};

/**
 * Parse a typed pledge amount to a number. Returns `null` for anything that
 * isn't a positive amount, which is what the validator treats as invalid — a
 * pledge of 0 is not a pledge.
 */
export function parseAmount(input: string): number | null {
  const digits = input.replace(NON_NUMERIC, '');
  if (digits === '') return null;
  const value = Number.parseFloat(digits);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** Group an amount for display while the field is not focused: `12500` → `12,500.00`. */
export function formatAmount(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Validate the whole form. Returns a message per invalid field; an empty object
 * means the pledge is ready to submit.
 *
 * The form is validated here rather than by the browser because every field
 * renders on the widget's dark band, where a native validation bubble is both
 * off-brand and easy to miss.
 */
export function validatePledgeForm(values: PledgeFormValues): PledgeFormErrors {
  const errors: PledgeFormErrors = {};

  if (values.firstName.trim() === '') errors.firstName = 'First name is required';
  if (values.lastName.trim() === '') errors.lastName = 'Last name is required';

  const email = values.email.trim();
  if (email === '') errors.email = 'Email is required';
  else if (!EMAIL.test(email)) errors.email = 'Enter a valid email address';

  const phone = values.phone.trim();
  if (phone === '') errors.phone = 'Mobile number is required';
  else if (!PHONE.test(phone)) errors.phone = 'Enter a valid phone number';

  if (values.amount.trim() === '') errors.amount = 'Please enter a pledge amount';
  else if (parseAmount(values.amount) === null) errors.amount = 'Enter an amount greater than 0';

  return errors;
}

/**
 * The note MP staff read on the Pledges row. perimeter-api builds this same
 * block when `notes` is omitted, but it has no spouse to include unless the
 * widget sends one — the spouse name is collected here and nowhere else in the
 * request, so the widget composes the note itself.
 */
export function buildPledgeNotes(values: PledgeFormValues): string {
  const spouse = values.spouse.trim();
  return [
    `First Name: ${values.firstName.trim()}`,
    `Last Name: ${values.lastName.trim()}`,
    `Phone: ${values.phone.trim()}`,
    `Email: ${values.email.trim()}`,
    'Address1:',
    'Address2:',
    'City, State, Zip:',
    `Country:${spouse ? `\nSpouse: ${spouse}` : ''}`,
  ].join('\n');
}
