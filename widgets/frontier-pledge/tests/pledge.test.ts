import { describe, it, expect } from 'vitest';
import {
  buildPledgeNotes,
  emptyPledgeForm,
  formatAmount,
  parseAmount,
  validatePledgeForm,
} from '../src/lib/pledge';
import type { PledgeFormValues } from '../src/types';

const valid: PledgeFormValues = {
  firstName: 'Samantha',
  spouse: '',
  lastName: 'Halpin',
  email: 'samantha@example.com',
  phone: '770-555-0134',
  amount: '12500',
};

describe('parseAmount', () => {
  it('strips separators and a typed dollar sign', () => {
    expect(parseAmount('$12,500.50')).toBe(12500.5);
  });
  it('rejects blank, zero, and non-numeric input', () => {
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('   ')).toBeNull();
    expect(parseAmount('0')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
  });
});

describe('formatAmount', () => {
  it('groups thousands and always shows cents', () => {
    expect(formatAmount(12500)).toBe('12,500.00');
    expect(formatAmount(7.5)).toBe('7.50');
  });
});

describe('validatePledgeForm', () => {
  it('accepts a complete pledge', () => {
    expect(validatePledgeForm(valid)).toEqual({});
  });
  it('treats spouse as optional', () => {
    expect(validatePledgeForm({ ...valid, spouse: '' })).toEqual({});
  });
  it('reports every empty required field at once', () => {
    expect(Object.keys(validatePledgeForm(emptyPledgeForm)).sort()).toEqual([
      'amount',
      'email',
      'firstName',
      'lastName',
      'phone',
    ]);
  });
  it('rejects a malformed email and phone', () => {
    const errors = validatePledgeForm({ ...valid, email: 'nope@', phone: '12' });
    expect(errors.email).toBe('Enter a valid email address');
    expect(errors.phone).toBe('Enter a valid phone number');
  });
  it('treats whitespace-only names as missing', () => {
    expect(validatePledgeForm({ ...valid, firstName: '   ' }).firstName).toBe(
      'First name is required',
    );
  });
});

describe('buildPledgeNotes', () => {
  it('writes the block MP staff read, with trimmed values', () => {
    expect(buildPledgeNotes({ ...valid, firstName: ' Samantha ' })).toBe(
      [
        'First Name: Samantha',
        'Last Name: Halpin',
        'Phone: 770-555-0134',
        'Email: samantha@example.com',
        'Address1:',
        'Address2:',
        'City, State, Zip:',
        'Country:',
      ].join('\n'),
    );
  });
  it('appends the spouse line only when a spouse was given', () => {
    expect(buildPledgeNotes({ ...valid, spouse: ' Drew ' })).toContain('Country:\nSpouse: Drew');
  });
});
