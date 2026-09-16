import * as React from 'react';
import type { RegistrationFormField } from '@perimeter/api-hooks';
import { Input } from '@perimeter/ui/input';
import { Label } from '@perimeter/ui/label';
import { Textarea } from '@perimeter/ui/textarea';
import { RichText } from './RichText';

/** `Form_Field_Types` ids (verified against MP 2026-09-14). */
export const FIELD_TYPE = {
  TEXT: 1,
  MEMO: 2,
  DATE: 3,
  RADIO_VERTICAL: 4,
  DROPDOWN: 5,
  INSTRUCTIONS: 6,
  RADIO_HORIZONTAL: 7,
  CHECKBOX: 8,
  FILE_UPLOAD: 9,
} as const;

export interface FormFieldInputProps {
  field: RegistrationFormField;
  id: string;
  value: string;
  onChange: (value: string) => void;
  /** Server-reported problem for this field, if any. */
  error: string | undefined;
}

/**
 * Whether a field is active given the answers so far: no `Depends_On`, or its
 * parent is active and answered with exactly `Depends_On_Value`. Mirrors the
 * server rule so the widget never asks for an answer the server would drop.
 */
export function isFieldActive(
  field: RegistrationFormField,
  fieldsById: ReadonlyMap<number, RegistrationFormField>,
  answers: ReadonlyMap<number, string>,
  seen: Set<number> = new Set(),
): boolean {
  if (field.dependsOnFieldId === null) return true;
  if (seen.has(field.formFieldId)) return false;
  seen.add(field.formFieldId);
  const parent = fieldsById.get(field.dependsOnFieldId);
  if (!parent) return true;
  if (!isFieldActive(parent, fieldsById, answers, seen)) return false;
  return (answers.get(parent.formFieldId) ?? '').trim() === (field.dependsOnValue ?? '').trim();
}

const CONTROL =
  'h-9 w-full max-w-md border border-border bg-bg px-3 font-sans text-sm text-fg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden';

/** One custom form field, rendered by `Field_Type_ID`. */
export function FormFieldInput({
  field,
  id,
  value,
  onChange,
  error,
}: FormFieldInputProps): React.JSX.Element {
  const labelNode = field.alternateLabelHtml ? (
    <RichText html={field.alternateLabelHtml} className="text-sm font-medium" />
  ) : (
    <span>{field.label}</span>
  );
  const required = field.required ? <span className="text-destructive"> *</span> : null;

  switch (field.fieldTypeId) {
    case FIELD_TYPE.INSTRUCTIONS:
      return (
        <div className="grid gap-1">
          <RichText html={field.alternateLabelHtml ?? field.label} className="text-sm" />
        </div>
      );

    case FIELD_TYPE.FILE_UPLOAD:
      return (
        <div className="grid gap-1">
          <Label htmlFor={id}>
            {labelNode}
            {required}
          </Label>
          <p className="text-sm text-muted-fg">
            This question asks for a file upload, which this page does not support.
            {field.required
              ? ' Because it is required, this section cannot be registered here.'
              : ''}
          </p>
        </div>
      );

    case FIELD_TYPE.MEMO:
      return (
        <div className="grid gap-1">
          <Label htmlFor={id}>
            {labelNode}
            {required}
          </Label>
          <Textarea
            id={id}
            value={value}
            rows={3}
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={error ? true : undefined}
            className="max-w-xl"
          />
          {error && <FieldError id={id}>{error}</FieldError>}
        </div>
      );

    case FIELD_TYPE.DATE:
      return (
        <div className="grid gap-1">
          <Label htmlFor={id}>
            {labelNode}
            {required}
          </Label>
          <Input
            id={id}
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={error ? true : undefined}
            className="max-w-xs"
          />
          {error && <FieldError id={id}>{error}</FieldError>}
        </div>
      );

    case FIELD_TYPE.RADIO_VERTICAL:
    case FIELD_TYPE.RADIO_HORIZONTAL: {
      const horizontal = field.fieldTypeId === FIELD_TYPE.RADIO_HORIZONTAL;
      return (
        <fieldset className="grid gap-2">
          <legend className="font-sans text-sm font-medium text-fg">
            {labelNode}
            {required}
          </legend>
          <div className={horizontal ? 'flex flex-wrap gap-4' : 'grid gap-1.5'}>
            {field.values.map((option) => {
              const optionId = `${id}-${slug(option)}`;
              return (
                <label
                  key={option}
                  htmlFor={optionId}
                  className="inline-flex min-h-11 cursor-pointer items-center gap-2 py-2 font-sans text-sm text-fg select-none @min-[768px]:min-h-0 @min-[768px]:py-0"
                >
                  <input
                    id={optionId}
                    type="radio"
                    name={id}
                    value={option}
                    checked={value === option}
                    onChange={() => onChange(option)}
                    className="size-4 shrink-0 cursor-pointer accent-primary"
                  />
                  {option}
                </label>
              );
            })}
          </div>
          {error && <FieldError id={id}>{error}</FieldError>}
        </fieldset>
      );
    }

    case FIELD_TYPE.DROPDOWN:
      return (
        <div className="grid gap-1">
          <Label htmlFor={id}>
            {labelNode}
            {required}
          </Label>
          <select
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={error ? true : undefined}
            className={CONTROL}
          >
            <option value="">Select…</option>
            {field.values.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {error && <FieldError id={id}>{error}</FieldError>}
        </div>
      );

    case FIELD_TYPE.CHECKBOX:
      return (
        <div className="grid gap-1">
          <label
            htmlFor={id}
            className="inline-flex min-h-11 cursor-pointer items-start gap-2 py-2 font-sans text-sm text-fg select-none @min-[768px]:min-h-0 @min-[768px]:py-0"
          >
            <input
              id={id}
              type="checkbox"
              checked={value === 'Yes'}
              onChange={(e) => onChange(e.target.checked ? 'Yes' : '')}
              className="mt-0.5 size-4 shrink-0 cursor-pointer accent-primary"
            />
            <span>
              {labelNode}
              {required}
            </span>
          </label>
          {error && <FieldError id={id}>{error}</FieldError>}
        </div>
      );

    default:
      return (
        <div className="grid gap-1">
          <Label htmlFor={id}>
            {labelNode}
            {required}
          </Label>
          <Input
            id={id}
            value={value}
            maxLength={4000}
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={error ? true : undefined}
            className="max-w-md"
          />
          {error && <FieldError id={id}>{error}</FieldError>}
        </div>
      );
  }
}

function FieldError({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <p id={`${id}-error`} role="alert" className="font-sans text-xs text-destructive">
      {children}
    </p>
  );
}

function slug(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'opt'
  );
}
