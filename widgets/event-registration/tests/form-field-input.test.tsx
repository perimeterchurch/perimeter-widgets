import * as React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { FormFieldInput } from '../src/components/FormFieldInput';
import { familyNight } from './fixtures';

afterEach(cleanup);

const base = familyNight.sections.find((s) => s.form)!.form!.fields[0]!;

describe('FormFieldInput labels', () => {
  it('keeps the required mark on the same line as an Alternate_Label', () => {
    // Childcare field 53302: Field_Label is the routine's machine key, the
    // parent-facing wording is the alternate label (stored as HTML).
    const field = {
      ...base,
      formFieldId: 53302,
      label: 'Contacts.Gender_ID',
      alternateLabelHtml: "<p>Child's Gender</p>",
      fieldTypeId: 4,
      values: ['Male', 'Female'],
      required: true,
    };
    render(
      <FormFieldInput field={field} id="f-53302" value="" onChange={() => {}} error={undefined} />,
    );
    const label = screen.getByText("Child's Gender").closest('label, legend')!;
    expect(label.textContent?.replace(/\s+/g, ' ').trim()).toBe("Child's Gender *");
    // The alternate label renders inline (a span, no div), so the mark cannot
    // wrap under the text.
    expect(label.querySelector('div')).toBeNull();
    expect(screen.getByText("Child's Gender").closest('span')).not.toBeNull();
    expect(screen.queryByText('Contacts.Gender_ID')).toBeNull();
  });

  it('still shows the plain Field_Label with its mark when there is no alternate', () => {
    render(
      <FormFieldInput
        field={{ ...base, label: 'Grade', alternateLabelHtml: null, required: true }}
        id="f-1"
        value=""
        onChange={() => {}}
        error={undefined}
      />,
    );
    const label = screen.getByText('Grade').closest('label, legend')!;
    expect(label.textContent?.replace(/\s+/g, ' ').trim()).toBe('Grade *');
  });
});
