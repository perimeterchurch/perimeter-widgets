import * as React from 'react';
import type {
  QuoteProblem,
  RegistrationAttendee,
  RegistrationOptionGroup,
  RegistrationPlanEntry,
  RegistrationSection,
  RosterMember,
} from '@perimeter/api-hooks';
import { Button } from '@perimeter/ui/button';
import { Input } from '@perimeter/ui/input';
import { Label } from '@perimeter/ui/label';
import { OptionGroupField } from './OptionGroupField';
import { isPlacementGroup, placementHint, resolvePlacement } from '../lib/placement';
import { FIELD_TYPE, FormFieldInput, isFieldActive } from './FormFieldInput';
import { RichText } from './RichText';
import { attendeeIdentity, newLocalId, type DraftRegistration } from '../lib/draft';
import { GRADE_OPTIONS, formatAge, formatGrade, formatPrice, parseEventDate } from '../lib/format';

/** `Household_Positions` a new member may be created with. */
const NEW_MEMBER_POSITIONS = [
  { id: 2, label: 'Child' },
  { id: 3, label: 'Other adult' },
  { id: 4, label: 'Adult child' },
] as const;

export interface RegistrantEditorProps {
  section: RegistrationSection;
  /** Existing draft when editing; null when adding. */
  existing: DraftRegistration | null;
  /** Household roster (signed in) or empty for a guest. */
  members: RosterMember[];
  /** Identities already in the draft for this section's event, so the picker can gray them out. */
  takenIdentities: ReadonlySet<string>;
  /** Guest viewers register themself; signed-in viewers pick from the roster or add a member. */
  mode: 'household' | 'guest';
  guestName: string;
  /** Problems the last quote reported for this registration, if any. */
  problems: QuoteProblem[];
  /** Congregation time zone; ages for room placement are taken on the event's start date. */
  timeZone: string;
  onSave: (registration: DraftRegistration) => void;
  onCancel: () => void;
}

type AttendeeChoice =
  | { kind: 'member'; contactId: number }
  | { kind: 'new' }
  | { kind: 'purchaser' };

interface NewMemberDraft {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  /** '' = not answered; otherwise a grade on the API scale as a string. */
  grade: string;
  genderId: '' | '1' | '2';
  householdPositionId: 2 | 3 | 4;
}

/**
 * The per-person form: who, which options, which answers. Client-side
 * validation is only what the visitor needs to finish the form (required
 * fields, a required option group); the server is the authority and its
 * problems are shown next to the fields on the next quote.
 */
export function RegistrantEditor({
  section,
  existing,
  members,
  takenIdentities,
  mode,
  guestName,
  problems,
  timeZone,
  onSave,
  onCancel,
}: RegistrantEditorProps): React.JSX.Element {
  const eventStart = parseEventDate(section.event.startDate, timeZone);
  const minorsOnly = section.audience.minorsOnly;
  const adultsOnly = section.audience.adultsOnly;
  const asksGrade = section.audience.minGrade !== null || section.audience.maxGrade !== null;
  const positionChoices = NEW_MEMBER_POSITIONS.filter((p) =>
    adultsOnly ? p.id !== 2 : minorsOnly ? p.id === 2 : true,
  );
  const eligibleMembers = members.filter((m) =>
    m.eligibility.some((e) => e.sectionKey === section.key && e.eligible),
  );

  const initialChoice: AttendeeChoice = existing
    ? existing.attendee.kind === 'contact'
      ? { kind: 'member', contactId: existing.attendee.contactId }
      : existing.attendee.kind === 'new'
        ? { kind: 'new' }
        : { kind: 'purchaser' }
    : mode === 'guest'
      ? { kind: 'purchaser' }
      : eligibleMembers.length === 1 && eligibleMembers[0]
        ? { kind: 'member', contactId: eligibleMembers[0].contactId }
        : { kind: 'member', contactId: -1 };

  const [choice, setChoice] = React.useState<AttendeeChoice>(initialChoice);
  // Birth dates the parent confirmed for existing household members, by
  // contact id; the roster's value is the default. The widget owns this for
  // minors-only sections — the server requires it there and writes a
  // correction back to the contact.
  const [memberBirthDates, setMemberBirthDates] = React.useState<Map<number, string>>(() =>
    existing?.attendee.kind === 'contact' && existing.attendee.dateOfBirth
      ? new Map([[existing.attendee.contactId, existing.attendee.dateOfBirth]])
      : new Map(),
  );
  const birthDateFor = (contactId: number): string =>
    memberBirthDates.get(contactId) ??
    members.find((m) => m.contactId === contactId)?.dateOfBirth ??
    '';
  // Grades the parent confirmed, by contact id; the roster's derived grade is
  // the default. Asked only when the section has a grade bound.
  const [memberGrades, setMemberGrades] = React.useState<Map<number, string>>(() =>
    existing?.attendee.kind === 'contact' && existing.attendee.grade !== undefined
      ? new Map([[existing.attendee.contactId, String(existing.attendee.grade)]])
      : new Map(),
  );
  const gradeFor = (contactId: number): string => {
    const confirmed = memberGrades.get(contactId);
    if (confirmed !== undefined) return confirmed;
    const known = members.find((m) => m.contactId === contactId)?.grade ?? null;
    return known === null ? '' : String(known);
  };
  const memberRequires = (contactId: number): ('birth_date' | 'grade')[] =>
    members
      .find((m) => m.contactId === contactId)
      ?.eligibility.find((e) => e.sectionKey === section.key)?.requires ?? [];
  const asksBirthDateFor = (contactId: number): boolean =>
    minorsOnly || memberRequires(contactId).includes('birth_date');
  const asksGradeFor = (contactId: number): boolean =>
    asksGrade || memberRequires(contactId).includes('grade') || placementNeedsGrade;

  const [newMember, setNewMember] = React.useState<NewMemberDraft>(() =>
    existing?.attendee.kind === 'new'
      ? {
          firstName: existing.attendee.firstName,
          lastName: existing.attendee.lastName,
          dateOfBirth: existing.attendee.dateOfBirth ?? '',
          grade: existing.attendee.grade === undefined ? '' : String(existing.attendee.grade),
          genderId: existing.attendee.genderId
            ? (String(existing.attendee.genderId) as '1' | '2')
            : '',
          householdPositionId: existing.attendee.householdPositionId as 2 | 3 | 4,
        }
      : {
          firstName: '',
          lastName: members[0]?.lastName ?? '',
          dateOfBirth: '',
          grade: '',
          genderId: '',
          householdPositionId: minorsOnly ? 2 : 3,
        },
  );
  const [options, setOptions] = React.useState<RegistrationPlanEntry['options']>(
    existing?.options ?? [],
  );
  const [promoCode, setPromoCode] = React.useState(existing?.promoCode ?? '');
  const [answers, setAnswers] = React.useState<Map<number, string>>(
    () => new Map((existing?.answers ?? []).map((a) => [a.formFieldId, a.response])),
  );
  const [localErrors, setLocalErrors] = React.useState<Map<string, string>>(new Map());

  // ── Room placement (mirror of the server rule) ────────────────────────
  const placementGroups = (section.product?.groups ?? []).filter(isPlacementGroup);
  const currentPerson = (): { dateOfBirth: string | null; grade: number | null; name: string } => {
    if (choice.kind === 'member' && choice.contactId > 0) {
      const member = members.find((m) => m.contactId === choice.contactId);
      const g = gradeFor(choice.contactId);
      return {
        dateOfBirth: birthDateFor(choice.contactId) || null,
        grade: g === '' ? null : Number(g),
        name: member?.firstName ?? 'this child',
      };
    }
    if (choice.kind === 'new') {
      return {
        dateOfBirth: newMember.dateOfBirth || null,
        grade: newMember.grade === '' ? null : Number(newMember.grade),
        name: newMember.firstName.trim() || 'this child',
      };
    }
    return { dateOfBirth: null, grade: null, name: guestName || 'you' };
  };
  const person = currentPerson();
  const placementOf = new Map(
    placementGroups.map((g) => [g.productOptionGroupId, resolvePlacement(g, person, eventStart)]),
  );
  /** Would a grade decide a room for this child? Then ask for one. */
  const placementNeedsGrade = placementGroups.some((g) => {
    const o = resolvePlacement(g, { dateOfBirth: person.dateOfBirth, grade: null }, eventStart);
    return o.kind === 'ask' && o.reason === 'needs_grade';
  });
  /** Groups the server will decide (or ask about) — no local "choose" error, no radios. */
  const decidedGroupIds = new Set(
    [...placementOf.entries()]
      .filter(
        ([, o]) =>
          o.kind === 'resolved' ||
          (o.kind === 'ask' && (o.reason === 'needs_birth_date' || o.reason === 'needs_grade')),
      )
      .map(([id]) => id),
  );
  const renderPlacement = (group: RegistrationOptionGroup): React.JSX.Element | null => {
    const outcome = placementOf.get(group.productOptionGroupId);
    if (!outcome || outcome.kind === 'not_placement') return null;
    if (outcome.kind === 'resolved') {
      return (
        <p className="font-sans text-sm text-fg" data-placement="resolved">
          <span className="font-medium">{group.name}</span> {outcome.price.title}
          <span className="text-muted-fg"> — from {person.name}&apos;s birth date</span>
        </p>
      );
    }
    const hint = placementHint(outcome.reason, person.name);
    return hint ? <p className="font-sans text-xs text-muted-fg">{hint}</p> : null;
  };

  const idPrefix = `reg-${section.key.replace(/[^a-z0-9]+/gi, '-')}-${existing?.localId ?? 'new'}`;
  const form = section.form;
  const product = section.product;
  const fieldsById = React.useMemo(
    () => new Map((form?.fields ?? []).map((f) => [f.formFieldId, f])),
    [form],
  );
  const groupsByFieldId = React.useMemo(() => {
    const map = new Map<number, NonNullable<typeof product>['groups']>();
    for (const g of product?.groups ?? []) {
      if (g.formFieldId !== null) map.set(g.formFieldId, [...(map.get(g.formFieldId) ?? []), g]);
    }
    return map;
  }, [product]);
  const standaloneGroups = (product?.groups ?? []).filter((g) => g.formFieldId === null);

  const serverErrorsByField = new Map<number, string>();
  const serverErrorsGeneral: string[] = [];
  for (const p of problems) {
    const fieldId = p.details?.formFieldId;
    if (typeof fieldId === 'number') serverErrorsByField.set(fieldId, p.message);
    else serverErrorsGeneral.push(p.message);
  }

  function setAnswer(fieldId: number, value: string): void {
    setAnswers((prev) => {
      const next = new Map(prev);
      next.set(fieldId, value);
      return next;
    });
  }

  function resolveAttendee():
    | { attendee: RegistrationAttendee; label: string }
    | { error: string } {
    if (choice.kind === 'purchaser') {
      return { attendee: { kind: 'purchaser' }, label: guestName || 'You' };
    }
    if (choice.kind === 'member') {
      const member = eligibleMembers.find((m) => m.contactId === choice.contactId);
      if (!member) return { error: 'Choose who this registration is for.' };
      const label = `${member.firstName} ${member.lastName}`.trim();
      const attendee: Extract<RegistrationAttendee, { kind: 'contact' }> = {
        kind: 'contact',
        contactId: member.contactId,
      };
      if (asksBirthDateFor(member.contactId)) {
        const dateOfBirth = birthDateFor(member.contactId);
        if (!dateOfBirth) return { error: `A date of birth is required for ${member.firstName}.` };
        attendee.dateOfBirth = dateOfBirth;
      }
      if (asksGradeFor(member.contactId)) {
        const grade = gradeFor(member.contactId);
        if (grade === '') return { error: `What grade is ${member.firstName} in?` };
        attendee.grade = Number(grade);
      }
      return { attendee, label };
    }
    const first = newMember.firstName.trim();
    const last = newMember.lastName.trim();
    if (!first || !last)
      return { error: 'Enter the first and last name of the person you are adding.' };
    const isMinor = newMember.householdPositionId === 2;
    if (isMinor && !newMember.dateOfBirth)
      return { error: 'A date of birth is required for a child.' };
    if (minorsOnly && !isMinor) return { error: 'This section is for children; choose "Child".' };
    if (adultsOnly && isMinor) return { error: 'This section is for adults.' };
    if (asksGrade && isMinor && newMember.grade === '')
      return { error: `What grade is ${first} in?` };
    return {
      attendee: {
        kind: 'new',
        firstName: first,
        lastName: last,
        ...(newMember.dateOfBirth ? { dateOfBirth: newMember.dateOfBirth } : {}),
        ...(newMember.grade !== '' ? { grade: Number(newMember.grade) } : {}),
        ...(newMember.genderId ? { genderId: Number(newMember.genderId) } : {}),
        householdPositionId: newMember.householdPositionId,
      },
      label: `${first} ${last}`,
    };
  }

  function handleSave(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const errors = new Map<string, string>();

    const resolved = resolveAttendee();
    if ('error' in resolved) errors.set('attendee', resolved.error);
    else if (
      takenIdentities.has(attendeeIdentity(resolved.attendee)) &&
      !(existing && attendeeIdentity(existing.attendee) === attendeeIdentity(resolved.attendee))
    ) {
      errors.set('attendee', 'That person is already in this registration for this event.');
    }

    for (const group of product?.groups ?? []) {
      if (!group.required) continue;
      if (decidedGroupIds.has(group.productOptionGroupId)) continue;
      const pickable = group.prices.filter((p) => !p.hidden && !p.isPromo);
      if (pickable.length === 0) continue;
      if (
        !options.some((o) =>
          pickable.some((p) => p.productOptionPriceId === o.productOptionPriceId),
        )
      ) {
        errors.set(`group:${group.productOptionGroupId}`, `Choose an option in "${group.name}".`);
      }
    }

    for (const field of form?.fields ?? []) {
      if (
        field.fieldTypeId === FIELD_TYPE.INSTRUCTIONS ||
        field.fieldTypeId === FIELD_TYPE.FILE_UPLOAD
      )
        continue;
      if (!isFieldActive(field, fieldsById, answers)) continue;
      if (field.required && !(answers.get(field.formFieldId) ?? '').trim()) {
        errors.set(`field:${field.formFieldId}`, 'This question is required.');
      }
    }

    setLocalErrors(errors);
    if (errors.size > 0 || 'error' in resolved) return;

    const activeAnswers = [...answers.entries()]
      .filter(([fieldId, value]) => {
        const field = fieldsById.get(fieldId);
        return (
          field !== undefined &&
          value.trim().length > 0 &&
          isFieldActive(field, fieldsById, answers)
        );
      })
      .map(([formFieldId, response]) => ({ formFieldId, response: response.trim() }));

    onSave({
      localId: existing?.localId ?? newLocalId(),
      sectionKey: section.key,
      attendee: resolved.attendee,
      attendeeLabel: resolved.label,
      options: options.filter((o) => {
        const group = placementGroups.find((g) =>
          g.prices.some((p) => p.productOptionPriceId === o.productOptionPriceId),
        );
        return !group || !decidedGroupIds.has(group.productOptionGroupId);
      }),
      promoCode: promoCode.trim() || undefined,
      answers: activeAnswers,
    });
  }

  const attendeeError = localErrors.get('attendee');
  const canAddMember = mode === 'household';

  return (
    <form onSubmit={handleSave} className="grid gap-5 border border-secondary bg-bg p-4 @md:p-6">
      <h4 className="font-sans text-lg font-bold text-fg">
        {existing ? 'Edit registration' : 'New registration'} — {section.displayName}
      </h4>

      {/* ── Who ─────────────────────────────────────────────────────── */}
      {mode === 'guest' ? (
        <p className="font-sans text-sm text-fg">
          Registering: <strong>{guestName || 'you'}</strong>
        </p>
      ) : (
        <fieldset className="grid gap-2">
          <legend className="mb-1 font-sans text-sm font-medium text-fg">
            Who is this for? <span className="text-destructive">*</span>
          </legend>
          <div className="grid gap-1.5">
            {members.map((m) => {
              const eligibility = m.eligibility.find((e) => e.sectionKey === section.key);
              const eligible = eligibility?.eligible ?? false;
              const taken =
                takenIdentities.has(`c${m.contactId}`) &&
                !(
                  existing?.attendee.kind === 'contact' &&
                  existing.attendee.contactId === m.contactId
                );
              const disabled = !eligible || taken;
              const id = `${idPrefix}-who-${m.contactId}`;
              return (
                <label
                  key={m.contactId}
                  htmlFor={id}
                  className={`inline-flex items-center gap-2 font-sans text-sm select-none ${
                    disabled ? 'cursor-not-allowed text-muted-fg' : 'cursor-pointer text-fg'
                  }`}
                >
                  <input
                    id={id}
                    type="radio"
                    name={`${idPrefix}-who`}
                    disabled={disabled}
                    checked={choice.kind === 'member' && choice.contactId === m.contactId}
                    onChange={() => setChoice({ kind: 'member', contactId: m.contactId })}
                    className="size-4 shrink-0 accent-primary"
                  />
                  <span>
                    {m.firstName} {m.lastName}
                    {m.isMinorPosition && m.age !== null && (
                      <span className="text-muted-fg">
                        {' '}
                        · {formatAge(m.age)}
                        {m.grade !== null ? `, ${formatGrade(m.grade)} grade` : ''}
                      </span>
                    )}
                  </span>
                  {taken ? (
                    <span className="text-xs text-muted-fg">already added</span>
                  ) : !eligible && eligibility?.reason ? (
                    <span className="text-xs text-muted-fg">
                      {eligibilityLabel(eligibility.reason)}
                    </span>
                  ) : null}
                </label>
              );
            })}
            {canAddMember && (
              <label
                htmlFor={`${idPrefix}-who-new`}
                className="inline-flex cursor-pointer items-center gap-2 font-sans text-sm text-fg select-none"
              >
                <input
                  id={`${idPrefix}-who-new`}
                  type="radio"
                  name={`${idPrefix}-who`}
                  checked={choice.kind === 'new'}
                  onChange={() => setChoice({ kind: 'new' })}
                  className="size-4 shrink-0 cursor-pointer accent-primary"
                />
                Someone not listed — add a family member
              </label>
            )}
          </div>
          {attendeeError && (
            <p role="alert" className="font-sans text-xs text-destructive">
              {attendeeError}
            </p>
          )}
        </fieldset>
      )}

      {choice.kind === 'member' && choice.contactId > 0 && asksGradeFor(choice.contactId) && (
        <div className="grid gap-1">
          <Label htmlFor={`${idPrefix}-member-grade`}>Grade *</Label>
          <select
            id={`${idPrefix}-member-grade`}
            required
            value={gradeFor(choice.contactId)}
            onChange={(e) => {
              const { contactId } = choice;
              setMemberGrades((prev) => new Map(prev).set(contactId, e.target.value));
            }}
            className="h-9 w-full border border-border bg-bg px-3 font-sans text-sm text-fg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
          >
            <option value="">Choose a grade</option>
            {GRADE_OPTIONS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
          <p className="font-sans text-xs text-muted-fg">
            This school year. A change updates our records.
          </p>
        </div>
      )}

      {choice.kind === 'member' && choice.contactId > 0 && asksBirthDateFor(choice.contactId) && (
        <div className="grid gap-1">
          <Label htmlFor={`${idPrefix}-member-dob`}>Date of birth *</Label>
          <Input
            id={`${idPrefix}-member-dob`}
            type="date"
            required
            value={birthDateFor(choice.contactId)}
            onChange={(e) => {
              const { contactId } = choice;
              setMemberBirthDates((prev) => new Map(prev).set(contactId, e.target.value));
            }}
          />
          <p className="font-sans text-xs text-muted-fg">
            Confirm or correct it — a change updates our records.
          </p>
        </div>
      )}

      {choice.kind === 'new' && (
        <div className="grid gap-3 border-l-2 border-border pl-4">
          <p className="font-sans text-xs text-muted-fg">
            They will be added to your household in our records.
          </p>
          <div className="grid gap-3 @md:grid-cols-2">
            <div className="grid gap-1">
              <Label htmlFor={`${idPrefix}-new-first`}>First name *</Label>
              <Input
                id={`${idPrefix}-new-first`}
                value={newMember.firstName}
                maxLength={50}
                autoComplete="off"
                onChange={(e) => setNewMember({ ...newMember, firstName: e.target.value })}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor={`${idPrefix}-new-last`}>Last name *</Label>
              <Input
                id={`${idPrefix}-new-last`}
                value={newMember.lastName}
                maxLength={50}
                autoComplete="off"
                onChange={(e) => setNewMember({ ...newMember, lastName: e.target.value })}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor={`${idPrefix}-new-dob`}>
                Date of birth{newMember.householdPositionId === 2 ? ' *' : ''}
              </Label>
              <Input
                id={`${idPrefix}-new-dob`}
                type="date"
                value={newMember.dateOfBirth}
                onChange={(e) => setNewMember({ ...newMember, dateOfBirth: e.target.value })}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor={`${idPrefix}-new-gender`}>Gender</Label>
              <select
                id={`${idPrefix}-new-gender`}
                value={newMember.genderId}
                onChange={(e) =>
                  setNewMember({ ...newMember, genderId: e.target.value as '' | '1' | '2' })
                }
                className="h-9 w-full border border-border bg-bg px-3 font-sans text-sm text-fg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
              >
                <option value="">Prefer not to say</option>
                <option value="1">Male</option>
                <option value="2">Female</option>
              </select>
            </div>
            {asksGrade && newMember.householdPositionId === 2 && (
              <div className="grid gap-1">
                <Label htmlFor={`${idPrefix}-new-grade`}>Grade *</Label>
                <select
                  id={`${idPrefix}-new-grade`}
                  value={newMember.grade}
                  onChange={(e) => setNewMember({ ...newMember, grade: e.target.value })}
                  className="h-9 w-full border border-border bg-bg px-3 font-sans text-sm text-fg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
                >
                  <option value="">Choose a grade</option>
                  {GRADE_OPTIONS.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {positionChoices.length > 1 && (
              <div className="grid gap-1">
                <Label htmlFor={`${idPrefix}-new-position`}>Relationship</Label>
                <select
                  id={`${idPrefix}-new-position`}
                  value={newMember.householdPositionId}
                  onChange={(e) =>
                    setNewMember({
                      ...newMember,
                      householdPositionId: Number(e.target.value) as 2 | 3 | 4,
                    })
                  }
                  className="h-9 w-full border border-border bg-bg px-3 font-sans text-sm text-fg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
                >
                  {positionChoices.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Price ──────────────────────────────────────────────────── */}
      {product && (
        <p className="font-sans text-sm text-fg">
          Registration price: <strong>{formatPrice(product.basePrice)}</strong>
          {product.depositPrice !== null && (
            <span className="text-muted-fg">
              {' '}
              · deposit option {formatPrice(product.depositPrice)}
            </span>
          )}
        </p>
      )}
      <RichText html={product?.descriptionHtml} className="text-sm text-muted-fg" />

      {/* ── Options not tied to a form field ───────────────────────── */}
      {standaloneGroups.map((group) => (
        <div key={group.productOptionGroupId} className="grid gap-1">
          {renderPlacement(group)}
          {!decidedGroupIds.has(group.productOptionGroupId) && (
            <OptionGroupField
              group={group}
              idPrefix={`${idPrefix}-g${group.productOptionGroupId}`}
              selections={options}
              onChange={setOptions}
            />
          )}
          {localErrors.get(`group:${group.productOptionGroupId}`) && (
            <p role="alert" className="font-sans text-xs text-destructive">
              {localErrors.get(`group:${group.productOptionGroupId}`)}
            </p>
          )}
        </div>
      ))}

      {/* ── Custom form ─────────────────────────────────────────────── */}
      {form && (
        <div className="grid gap-4">
          <RichText html={form.instructionsHtml} className="text-sm" />
          {form.fields
            .filter((field) => isFieldActive(field, fieldsById, answers))
            .map((field) => (
              <React.Fragment key={field.formFieldId}>
                <FormFieldInput
                  field={field}
                  id={`${idPrefix}-f${field.formFieldId}`}
                  value={answers.get(field.formFieldId) ?? ''}
                  onChange={(value) => setAnswer(field.formFieldId, value)}
                  error={
                    localErrors.get(`field:${field.formFieldId}`) ??
                    serverErrorsByField.get(field.formFieldId)
                  }
                />
                {(groupsByFieldId.get(field.formFieldId) ?? []).map((group) => (
                  <OptionGroupField
                    key={group.productOptionGroupId}
                    group={group}
                    idPrefix={`${idPrefix}-g${group.productOptionGroupId}`}
                    selections={options}
                    onChange={setOptions}
                  />
                ))}
              </React.Fragment>
            ))}
        </div>
      )}

      {/* ── Promo code ─────────────────────────────────────────────── */}
      {product && product.basePrice > 0 && (
        <div className="grid gap-1">
          <Label htmlFor={`${idPrefix}-promo`}>Promo code</Label>
          <Input
            id={`${idPrefix}-promo`}
            value={promoCode}
            maxLength={20}
            autoComplete="off"
            onChange={(e) => setPromoCode(e.target.value)}
            className="max-w-xs uppercase"
          />
        </div>
      )}

      {serverErrorsGeneral.length > 0 && (
        <ul role="alert" className="grid gap-1 font-sans text-sm text-destructive">
          {serverErrorsGeneral.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" size="lg">
          {existing ? 'Save changes' : 'Add to registration'}
        </Button>
        <Button type="button" variant="outline" size="lg" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function eligibilityLabel(
  reason: NonNullable<RosterMember['eligibility'][number]['reason']>,
): string {
  switch (reason) {
    case 'already_registered':
      return 'already registered';
    case 'minors_only':
      return 'children only';
    case 'too_young':
      return 'too young';
    case 'too_old':
      return 'too old';
    case 'wrong_grade':
      return 'not this grade';
    case 'household_position':
    case 'gender':
      return 'not eligible';
    case 'section_closed':
      return 'closed';
    default:
      return '';
  }
}
