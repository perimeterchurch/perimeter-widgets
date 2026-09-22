import * as React from 'react';
import { Check, Copy, TriangleAlert } from 'lucide-react';
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
import { GuestContactForm } from './PurchaserForm';
import {
  isPlacementGroup,
  placementHint,
  resolvePlacement,
  type PlacementOutcome,
} from '../lib/placement';
import { FIELD_TYPE, FormFieldInput, isFieldActive } from './FormFieldInput';
import { RichText } from './RichText';
import {
  attendeeIdentity,
  newLocalId,
  type DraftRegistration,
  type GuestDetails,
} from '../lib/draft';
import { GRADE_OPTIONS, formatAge, formatGrade, formatPrice, parseEventDate } from '../lib/format';

/** `Household_Positions` a new member may be created with. */
const NEW_MEMBER_POSITIONS = [
  { id: 2, label: 'Child' },
  { id: 3, label: 'Other adult' },
  { id: 4, label: 'Adult child' },
] as const;

const SELECT_CLASS =
  'h-9 w-full border border-border bg-bg px-3 font-sans text-sm text-fg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden';

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
  /** Guest path: the purchaser's own details are collected here, on the first add. */
  guest?: GuestDetails | undefined;
  onGuestChange?: ((patch: Partial<GuestDetails>) => void) | undefined;
  /** The quote says the product needs a postal address. */
  addressRequired?: boolean;
  /** Problems the last quote reported for this registration, if any. */
  problems: QuoteProblem[];
  /** Congregation time zone; ages for room placement are taken on the event's start date. */
  timeZone: string;
  /** False on an all-free event: the price line is not shown. */
  showPrices: boolean;
  /**
   * Inside the phone bottom sheet: the sheet supplies the border and the
   * heading, and the action row sticks to the sheet's bottom edge.
   */
  embedded?: boolean;
  /** False when the host (a section card) already draws the border and padding. */
  framed?: boolean;
  /** One registration per person picked — several at once when adding, exactly one when editing. */
  onSave: (registrations: DraftRegistration[]) => void;
  onCancel: () => void;
}

/** `c<contactId>` for a household member, `new` for someone being added, `purchaser` for a guest. */
type PersonKey = string;

interface NewMemberDraft {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  /** '' = not answered; otherwise a grade on the API scale as a string. */
  grade: string;
  genderId: '' | '1' | '2';
  householdPositionId: 2 | 3 | 4;
}

/** What one person's block collects. Birth date and grade only matter for members. */
interface PersonState {
  dateOfBirth: string;
  grade: string;
  options: RegistrationPlanEntry['options'];
  promoCode: string;
  answers: Map<number, string>;
}

interface PersonView {
  key: PersonKey;
  /** null for `new` / `purchaser`. */
  member: RosterMember | null;
  firstName: string;
  label: string;
}

const emptyPerson = (): PersonState => ({
  dateOfBirth: '',
  grade: '',
  options: [],
  promoCode: '',
  answers: new Map(),
});

/**
 * The per-section form: who, and for each of them which options and which
 * answers. Adding lets a parent tick several household members at once —
 * every ticked person gets their own block and the save produces one
 * registration each. Editing and guest registration are single-person.
 * Client-side validation is only what the visitor needs to finish the form;
 * the server is the authority and its problems are shown on the next quote.
 */
export function RegistrantEditor({
  section,
  existing,
  members,
  takenIdentities,
  mode,
  guestName,
  guest,
  onGuestChange,
  addressRequired = false,
  problems,
  timeZone,
  showPrices,
  embedded = false,
  framed = true,
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
  const form = section.form;
  const product = section.product;
  const idPrefix = `reg-${section.key.replace(/[^a-z0-9]+/gi, '-')}-${existing?.localId ?? 'new'}`;

  // ── Who ───────────────────────────────────────────────────────────────
  const editingKey: PersonKey | null = existing
    ? existing.attendee.kind === 'contact'
      ? `c${existing.attendee.contactId}`
      : existing.attendee.kind
    : null;
  const [selected, setSelected] = React.useState<Set<number>>(() => {
    if (existing?.attendee.kind === 'contact') return new Set([existing.attendee.contactId]);
    if (!existing && mode === 'household' && eligibleMembers.length === 1 && eligibleMembers[0])
      return new Set([eligibleMembers[0].contactId]);
    return new Set();
  });
  const [addNew, setAddNew] = React.useState(existing?.attendee.kind === 'new');

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

  // ── Per-person state ──────────────────────────────────────────────────
  const [persons, setPersons] = React.useState<Map<PersonKey, PersonState>>(() => {
    const map = new Map<PersonKey, PersonState>();
    if (existing && editingKey) {
      map.set(editingKey, {
        dateOfBirth:
          existing.attendee.kind === 'contact' ? (existing.attendee.dateOfBirth ?? '') : '',
        grade:
          existing.attendee.kind === 'contact' && existing.attendee.grade !== undefined
            ? String(existing.attendee.grade)
            : '',
        options: existing.options,
        promoCode: existing.promoCode ?? '',
        answers: new Map(existing.answers.map((a) => [a.formFieldId, a.response])),
      });
    }
    return map;
  });
  const [localErrors, setLocalErrors] = React.useState<Map<string, string>>(new Map());

  /**
   * A member's block opens with the answers MP already holds for them
   * (current Contact_Attributes rendered for this form's mapped fields) —
   * confirm-or-correct. Only fields this section's form actually shows.
   */
  const prefilledAnswers = (key: PersonKey): Map<number, string> => {
    const member = key.startsWith('c')
      ? members.find((m) => m.contactId === Number(key.slice(1)))
      : undefined;
    const fieldIds = new Set((section.form?.fields ?? []).map((f) => f.formFieldId));
    return new Map(
      (member?.prefill ?? [])
        .filter((a) => fieldIds.has(a.formFieldId))
        .map((a) => [a.formFieldId, a.response]),
    );
  };
  const stateOf = (key: PersonKey): PersonState =>
    persons.get(key) ?? { ...emptyPerson(), answers: prefilledAnswers(key) };
  const updatePerson = (key: PersonKey, patch: Partial<PersonState>): void =>
    setPersons((prev) => new Map(prev).set(key, { ...stateOf(key), ...patch }));

  const memberOf = (key: PersonKey): RosterMember | null =>
    key.startsWith('c')
      ? (members.find((m) => m.contactId === Number(key.slice(1))) ?? null)
      : null;
  /** Roster value unless the parent typed a correction. */
  const birthDateFor = (key: PersonKey): string => {
    const typed = persons.get(key)?.dateOfBirth ?? '';
    return typed !== '' ? typed : (memberOf(key)?.dateOfBirth ?? '');
  };
  const gradeFor = (key: PersonKey): string => {
    const typed = persons.get(key)?.grade ?? '';
    if (typed !== '') return typed;
    const known = memberOf(key)?.grade ?? null;
    return known === null ? '' : String(known);
  };
  const memberRequires = (key: PersonKey): ('birth_date' | 'grade')[] =>
    memberOf(key)?.eligibility.find((e) => e.sectionKey === section.key)?.requires ?? [];

  // ── Room placement (mirror of the server rule) ────────────────────────
  const placementGroups = (product?.groups ?? []).filter(isPlacementGroup);
  const personFacts = (key: PersonKey): { dateOfBirth: string | null; grade: number | null } => {
    if (key === 'new') {
      return {
        dateOfBirth: newMember.dateOfBirth || null,
        grade: newMember.grade === '' ? null : Number(newMember.grade),
      };
    }
    if (key === 'purchaser') return { dateOfBirth: null, grade: null };
    const g = gradeFor(key);
    return { dateOfBirth: birthDateFor(key) || null, grade: g === '' ? null : Number(g) };
  };
  const placementFor = (key: PersonKey): Map<number, PlacementOutcome> => {
    const facts = personFacts(key);
    return new Map(
      placementGroups.map((g) => [g.productOptionGroupId, resolvePlacement(g, facts, eventStart)]),
    );
  };
  const placementNeedsGradeFor = (key: PersonKey): boolean => {
    const facts = personFacts(key);
    return placementGroups.some((g) => {
      const o = resolvePlacement(g, { dateOfBirth: facts.dateOfBirth, grade: null }, eventStart);
      return o.kind === 'ask' && o.reason === 'needs_grade';
    });
  };
  const decidedGroupIdsFor = (outcomes: Map<number, PlacementOutcome>): Set<number> =>
    new Set(
      [...outcomes.entries()]
        .filter(
          ([, o]) =>
            o.kind === 'resolved' ||
            (o.kind === 'ask' && (o.reason === 'needs_birth_date' || o.reason === 'needs_grade')),
        )
        .map(([id]) => id),
    );
  const asksBirthDateFor = (key: PersonKey): boolean =>
    key.startsWith('c') && (minorsOnly || memberRequires(key).includes('birth_date'));
  const asksGradeFor = (key: PersonKey): boolean =>
    key.startsWith('c') &&
    (asksGrade || memberRequires(key).includes('grade') || placementNeedsGradeFor(key));

  // ── Who is in the editor right now ────────────────────────────────────
  const views: PersonView[] = [];
  if (mode === 'guest') {
    views.push({
      key: 'purchaser',
      member: null,
      firstName: guestName || 'you',
      label: guestName || 'You',
    });
  } else {
    for (const m of members) {
      if (!selected.has(m.contactId)) continue;
      views.push({
        key: `c${m.contactId}`,
        member: m,
        firstName: m.firstName,
        label: `${m.firstName} ${m.lastName}`.trim(),
      });
    }
    if (addNew) {
      views.push({
        key: 'new',
        member: null,
        firstName: newMember.firstName.trim() || 'this person',
        label: `${newMember.firstName.trim()} ${newMember.lastName.trim()}`.trim(),
      });
    }
  }
  const multi = views.length > 1;

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

  // ── Resolve one person into an attendee ───────────────────────────────
  function resolveAttendee(view: PersonView): RegistrationAttendee | { error: string } {
    if (view.key === 'purchaser') return { kind: 'purchaser' };
    if (view.member) {
      const member = view.member;
      const attendee: Extract<RegistrationAttendee, { kind: 'contact' }> = {
        kind: 'contact',
        contactId: member.contactId,
      };
      if (asksBirthDateFor(view.key)) {
        const dateOfBirth = birthDateFor(view.key);
        if (!dateOfBirth) return { error: `A date of birth is required for ${member.firstName}.` };
        attendee.dateOfBirth = dateOfBirth;
      }
      if (asksGradeFor(view.key)) {
        const grade = gradeFor(view.key);
        if (grade === '') return { error: `What grade is ${member.firstName} in?` };
        attendee.grade = Number(grade);
      }
      return attendee;
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
    if ((asksGrade || placementNeedsGradeFor('new')) && isMinor && newMember.grade === '')
      return { error: `What grade is ${first} in?` };
    return {
      kind: 'new',
      firstName: first,
      lastName: last,
      ...(newMember.dateOfBirth ? { dateOfBirth: newMember.dateOfBirth } : {}),
      ...(newMember.grade !== '' ? { grade: Number(newMember.grade) } : {}),
      ...(newMember.genderId ? { genderId: Number(newMember.genderId) } : {}),
      householdPositionId: newMember.householdPositionId,
    };
  }

  /** Everything that stops one person from being saved, keyed like `localErrors`. */
  function validatePerson(view: PersonView): Map<string, string> {
    const errors = new Map<string, string>();
    const state = stateOf(view.key);
    const resolved = resolveAttendee(view);
    if ('error' in resolved) {
      errors.set(`${view.key}:attendee`, resolved.error);
      return errors;
    }
    const identity = attendeeIdentity(resolved);
    if (
      takenIdentities.has(identity) &&
      !(existing && attendeeIdentity(existing.attendee) === identity)
    ) {
      errors.set(
        `${view.key}:attendee`,
        `${view.label || 'That person'} is already in this registration for this event.`,
      );
    }

    const decided = decidedGroupIdsFor(placementFor(view.key));
    for (const group of product?.groups ?? []) {
      if (!group.required || decided.has(group.productOptionGroupId)) continue;
      const pickable = group.prices.filter((p) => !p.hidden && !p.isPromo);
      if (pickable.length === 0) continue;
      if (
        !state.options.some((o) =>
          pickable.some((p) => p.productOptionPriceId === o.productOptionPriceId),
        )
      ) {
        errors.set(
          `${view.key}:group:${group.productOptionGroupId}`,
          `Choose an option in "${group.name}".`,
        );
      }
    }

    for (const field of form?.fields ?? []) {
      if (
        field.fieldTypeId === FIELD_TYPE.INSTRUCTIONS ||
        field.fieldTypeId === FIELD_TYPE.FILE_UPLOAD
      )
        continue;
      if (!isFieldActive(field, fieldsById, state.answers)) continue;
      if (field.required && !(state.answers.get(field.formFieldId) ?? '').trim()) {
        errors.set(`${view.key}:field:${field.formFieldId}`, 'This question is required.');
      }
    }
    return errors;
  }

  /** One valid person as the draft registration the save produces. */
  function buildRegistration(view: PersonView, resolved: RegistrationAttendee): DraftRegistration {
    const state = stateOf(view.key);
    const decided = decidedGroupIdsFor(placementFor(view.key));
    const activeAnswers = [...state.answers.entries()]
      .filter(([fieldId, value]) => {
        const field = fieldsById.get(fieldId);
        return (
          field !== undefined &&
          value.trim().length > 0 &&
          isFieldActive(field, fieldsById, state.answers)
        );
      })
      .map(([formFieldId, response]) => ({ formFieldId, response: response.trim() }));
    return {
      localId: existing?.localId ?? newLocalId(),
      sectionKey: section.key,
      attendee: resolved,
      attendeeLabel: view.label || (view.key === 'purchaser' ? guestName || 'You' : ''),
      options: state.options.filter((o) => {
        const group = placementGroups.find((g) =>
          g.prices.some((p) => p.productOptionPriceId === o.productOptionPriceId),
        );
        return !group || !decided.has(group.productOptionGroupId);
      }),
      promoCode: state.promoCode.trim() || undefined,
      answers: activeAnswers,
    };
  }

  const formRef = React.useRef<HTMLFormElement>(null);

  function handleSave(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const errors = new Map<string, string>();
    const out: DraftRegistration[] = [];

    if (views.length === 0) errors.set('who', 'Choose who this registration is for.');

    if (mode === 'guest' && guest) {
      const blank = (v: string) => v.trim().length === 0;
      if ([guest.firstName, guest.lastName, guest.email, guest.phone].some(blank)) {
        errors.set('guest', 'Please fill in your name, email and phone.');
      } else if (
        addressRequired &&
        [
          guest.address.line1,
          guest.address.city,
          guest.address.state,
          guest.address.postalCode,
        ].some(blank)
      ) {
        errors.set('guest', 'Please fill in your address.');
      }
    }

    for (const view of views) {
      const personErrors = validatePerson(view);
      if (personErrors.size > 0) {
        personErrors.forEach((message, key) => errors.set(key, message));
        continue;
      }
      const resolved = resolveAttendee(view);
      if ('error' in resolved) continue;
      out.push(buildRegistration(view, resolved));
    }

    setLocalErrors(errors);
    if (errors.size > 0) {
      // Open the first drawer that still needs something and bring it into view.
      const firstBad = views.find((v) => [...errors.keys()].some((k) => k.startsWith(`${v.key}:`)));
      if (firstBad) {
        setOpenKey(firstBad.key);
        setTimeout(() => {
          formRef.current
            ?.querySelector(`[data-person="${firstBad.key}"]`)
            ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }, 0);
      }
      return;
    }
    onSave(out);
  }

  // ── Drawers: each ticked person answers right under their name ──────────
  // `undefined` = nothing chosen yet, so the first incomplete person opens on
  // their own; a person whose record already answers everything stays
  // collapsed to a summary row.
  const drawerMode = mode === 'household' && !existing;
  const [openKey, setOpenKey] = React.useState<PersonKey | null | undefined>(undefined);
  const isComplete = (view: PersonView): boolean => validatePerson(view).size === 0;
  const openDrawer: PersonKey | null =
    openKey === undefined ? (views.find((v) => !isComplete(v))?.key ?? null) : openKey;
  const viewOf = (m: RosterMember): PersonView => ({
    key: `c${m.contactId}`,
    member: m,
    firstName: m.firstName,
    label: `${m.firstName} ${m.lastName}`.trim(),
  });

  /** What a collapsed row shows: the room, the options and the answers given so far. */
  const summaryOf = (view: PersonView): string[] => {
    const state = stateOf(view.key);
    const chips: string[] = [];
    const outcomes = placementFor(view.key);
    const decided = decidedGroupIdsFor(outcomes);
    for (const o of outcomes.values()) if (o.kind === 'resolved') chips.push(o.price.title);
    for (const g of product?.groups ?? []) {
      if (decided.has(g.productOptionGroupId)) continue;
      for (const price of g.prices) {
        if (state.options.some((o) => o.productOptionPriceId === price.productOptionPriceId))
          chips.push(price.title);
      }
    }
    for (const field of form?.fields ?? []) {
      if (field.fieldTypeId === FIELD_TYPE.INSTRUCTIONS) continue;
      const value = state.answers.get(field.formFieldId)?.trim();
      if (value && isFieldActive(field, fieldsById, state.answers))
        chips.push(value.length > 24 ? `${value.slice(0, 24)}…` : value);
    }
    return chips;
  };

  /** "Done" re-checks the person; with nothing missing the drawer collapses. */
  const closeDrawer = (view: PersonView): void => {
    const personErrors = validatePerson(view);
    setLocalErrors((prev) => {
      const next = new Map([...prev].filter(([k]) => !k.startsWith(`${view.key}:`)));
      personErrors.forEach((m, k) => next.set(k, m));
      return next;
    });
    if (personErrors.size === 0) setOpenKey(null);
  };

  const toggleMember = (m: RosterMember, on: boolean): void => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(m.contactId);
      else next.delete(m.contactId);
      return next;
    });
    const key = `c${m.contactId}`;
    if (on) {
      if (!isComplete(viewOf(m))) setOpenKey(key);
    } else if (openDrawer === key) {
      setOpenKey(null);
    }
  };

  const toggleAddNew = (on: boolean): void => {
    setAddNew(on);
    if (on) setOpenKey('new');
    else if (openDrawer === 'new') setOpenKey(null);
  };

  /** Copy one block's form answers onto another — the second child usually matches the first. */
  const copyAnswers = (from: PersonKey, to: PersonKey): void =>
    updatePerson(to, { answers: new Map(stateOf(from).answers) });

  const canAddMember = mode === 'household';
  const saveLabel = existing
    ? 'Save changes'
    : multi
      ? `Add ${views.length} to registration`
      : 'Add to registration';

  // ── One person's block ────────────────────────────────────────────────
  const renderPerson = (view: PersonView, index: number): React.JSX.Element => {
    const key = view.key;
    const state = stateOf(key);
    const pid = `${idPrefix}-${key}`;
    const outcomes = placementFor(key);
    const decided = decidedGroupIdsFor(outcomes);
    const err = (k: string) => localErrors.get(`${key}:${k}`);
    const previous = index > 0 ? views[index - 1] : null;

    const renderPlacement = (group: RegistrationOptionGroup): React.JSX.Element | null => {
      const outcome = outcomes.get(group.productOptionGroupId);
      if (!outcome || outcome.kind === 'not_placement') return null;
      if (outcome.kind === 'resolved') {
        return (
          <p className="font-sans text-sm text-fg" data-placement="resolved">
            <span className="font-medium">{group.name}</span> {outcome.price.title}
            <span className="text-muted-fg"> — from {view.firstName}&apos;s birth date</span>
          </p>
        );
      }
      const hint = placementHint(outcome.reason, view.firstName);
      return hint ? <p className="font-sans text-xs text-muted-fg">{hint}</p> : null;
    };

    const setOptions = (next: RegistrationPlanEntry['options']) =>
      updatePerson(key, { options: next });
    const setAnswer = (fieldId: number, value: string) =>
      updatePerson(key, { answers: new Map(state.answers).set(fieldId, value) });

    return (
      <div key={key} className="grid gap-4" data-person={key}>
        {err('attendee') && (
          <p role="alert" className="font-sans text-xs text-destructive">
            {err('attendee')}
          </p>
        )}

        {key === 'new' && (
          <div className="grid gap-3">
            <p className="font-sans text-xs text-muted-fg">
              They will be added to your household in our records.
            </p>
            <div className="grid gap-3 @min-[480px]:grid-cols-2">
              <div className="grid gap-1">
                <Label htmlFor={`${pid}-first`}>First name *</Label>
                <Input
                  id={`${pid}-first`}
                  value={newMember.firstName}
                  maxLength={50}
                  autoComplete="off"
                  onChange={(e) => setNewMember({ ...newMember, firstName: e.target.value })}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor={`${pid}-last`}>Last name *</Label>
                <Input
                  id={`${pid}-last`}
                  value={newMember.lastName}
                  maxLength={50}
                  autoComplete="off"
                  onChange={(e) => setNewMember({ ...newMember, lastName: e.target.value })}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor={`${pid}-dob`}>
                  Date of birth{newMember.householdPositionId === 2 ? ' *' : ''}
                </Label>
                <Input
                  id={`${pid}-dob`}
                  type="date"
                  value={newMember.dateOfBirth}
                  onChange={(e) => setNewMember({ ...newMember, dateOfBirth: e.target.value })}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor={`${pid}-gender`}>Gender</Label>
                <select
                  id={`${pid}-gender`}
                  value={newMember.genderId}
                  onChange={(e) =>
                    setNewMember({ ...newMember, genderId: e.target.value as '' | '1' | '2' })
                  }
                  className={SELECT_CLASS}
                >
                  <option value="">Prefer not to say</option>
                  <option value="1">Male</option>
                  <option value="2">Female</option>
                </select>
              </div>
              {(asksGrade || placementNeedsGradeFor('new')) &&
                newMember.householdPositionId === 2 && (
                  <div className="grid gap-1">
                    <Label htmlFor={`${pid}-grade`}>Grade *</Label>
                    <select
                      id={`${pid}-grade`}
                      value={newMember.grade}
                      onChange={(e) => setNewMember({ ...newMember, grade: e.target.value })}
                      className={SELECT_CLASS}
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
                  <Label htmlFor={`${pid}-position`}>Relationship</Label>
                  <select
                    id={`${pid}-position`}
                    value={newMember.householdPositionId}
                    onChange={(e) =>
                      setNewMember({
                        ...newMember,
                        householdPositionId: Number(e.target.value) as 2 | 3 | 4,
                      })
                    }
                    className={SELECT_CLASS}
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

        {asksGradeFor(key) && (
          <div className="grid gap-1">
            <Label htmlFor={`${pid}-member-grade`}>Grade *</Label>
            <select
              id={`${pid}-member-grade`}
              required
              value={gradeFor(key)}
              onChange={(e) => updatePerson(key, { grade: e.target.value })}
              className={SELECT_CLASS}
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

        {asksBirthDateFor(key) && (
          <div className="grid gap-1">
            <Label htmlFor={`${pid}-member-dob`}>Date of birth *</Label>
            <Input
              id={`${pid}-member-dob`}
              type="date"
              required
              value={birthDateFor(key)}
              onChange={(e) => updatePerson(key, { dateOfBirth: e.target.value })}
            />
            <p className="font-sans text-xs text-muted-fg">
              Confirm or correct it — a change updates our records.
            </p>
          </div>
        )}

        {/* ── Options not tied to a form field ─────────────────────── */}
        {standaloneGroups.map((group) => (
          <div key={group.productOptionGroupId} className="grid gap-1">
            {renderPlacement(group)}
            {!decided.has(group.productOptionGroupId) && (
              <OptionGroupField
                group={group}
                idPrefix={`${pid}-g${group.productOptionGroupId}`}
                selections={state.options}
                onChange={setOptions}
              />
            )}
            {err(`group:${group.productOptionGroupId}`) && (
              <p role="alert" className="font-sans text-xs text-destructive">
                {err(`group:${group.productOptionGroupId}`)}
              </p>
            )}
          </div>
        ))}

        {/* ── Custom form ───────────────────────────────────────────── */}
        {form && (
          <div className="grid gap-4">
            {index === 0 && <RichText html={form.instructionsHtml} className="text-sm" />}
            {prefilledAnswers(key).size > 0 && (
              <p className="font-sans text-xs text-muted-fg" data-prefilled="true">
                Filled in from {view.firstName}&apos;s record — check it&apos;s still right.
              </p>
            )}
            {previous && stateOf(previous.key).answers.size > 0 && (
              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => copyAnswers(previous.key, key)}
                >
                  <Copy aria-hidden className="mr-1.5 size-4" />
                  Copy {previous.firstName}&apos;s answers
                </Button>
              </div>
            )}
            {form.fields
              .filter((field) => isFieldActive(field, fieldsById, state.answers))
              .map((field) => (
                <React.Fragment key={field.formFieldId}>
                  <FormFieldInput
                    field={field}
                    id={`${pid}-f${field.formFieldId}`}
                    value={state.answers.get(field.formFieldId) ?? ''}
                    onChange={(value) => setAnswer(field.formFieldId, value)}
                    error={
                      err(`field:${field.formFieldId}`) ??
                      (existing ? serverErrorsByField.get(field.formFieldId) : undefined)
                    }
                  />
                  {(groupsByFieldId.get(field.formFieldId) ?? []).map((group) => (
                    <OptionGroupField
                      key={group.productOptionGroupId}
                      group={group}
                      idPrefix={`${pid}-g${group.productOptionGroupId}`}
                      selections={state.options}
                      onChange={setOptions}
                    />
                  ))}
                </React.Fragment>
              ))}
          </div>
        )}

        {/* ── Promo code ───────────────────────────────────────────── */}
        {product && product.basePrice > 0 && (
          <div className="grid gap-1">
            <Label htmlFor={`${pid}-promo`}>Promo code</Label>
            <Input
              id={`${pid}-promo`}
              value={state.promoCode}
              maxLength={20}
              autoComplete="off"
              onChange={(e) => updatePerson(key, { promoCode: e.target.value })}
              className="max-w-xs uppercase"
            />
          </div>
        )}
      </div>
    );
  };

  /** Under a ticked name: the open form, or a one-line summary with a way back in. */
  const renderDrawer = (view: PersonView): React.JSX.Element => {
    const index = views.findIndex((v) => v.key === view.key);
    if (openDrawer === view.key) {
      return (
        <div
          className="mb-2 ml-2 grid gap-4 border-l-2 border-secondary pt-1 pb-3 pl-4"
          data-drawer-state="open"
        >
          {renderPerson(view, index)}
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label={`Done with ${view.firstName}`}
              onClick={() => closeDrawer(view)}
            >
              <Check aria-hidden className="mr-1.5 size-4" />
              Done
            </Button>
          </div>
        </div>
      );
    }
    const complete = isComplete(view);
    const chips = summaryOf(view);
    return (
      <div
        className="mb-1 ml-6 flex flex-wrap items-center justify-between gap-x-3 gap-y-1"
        data-drawer-state={complete ? 'complete' : 'incomplete'}
      >
        <span className="inline-flex min-w-0 items-start gap-1.5 font-sans text-xs text-muted-fg">
          {complete ? (
            <Check aria-hidden className="mt-0.5 size-3.5 shrink-0 text-primary" />
          ) : (
            <TriangleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0 text-warning-fg" />
          )}
          <span>
            {complete ? (chips.length > 0 ? chips.join(' · ') : 'Ready') : 'Needs answers'}
          </span>
        </span>
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto px-0"
          aria-label={`${complete ? 'Change' : 'Add'} answers for ${view.firstName}`}
          onClick={() => setOpenKey(view.key)}
        >
          {complete ? 'Change' : 'Answer'}
        </Button>
      </div>
    );
  };

  return (
    <form
      ref={formRef}
      onSubmit={handleSave}
      noValidate
      // Inside a card there is no visible heading (the event title sits right
      // above), so name the form for screen readers; the card names the event.
      aria-label={
        !embedded && !framed ? (existing ? 'Edit registration' : 'New registration') : undefined
      }
      className={
        embedded
          ? 'grid gap-5 bg-bg'
          : framed
            ? 'grid gap-5 border border-secondary bg-bg p-4 @min-[480px]:p-6'
            : 'grid gap-5 bg-bg'
      }
    >
      {!embedded && framed && (
        <h4 id={`editor-${section.key}-title`} className="font-sans text-lg font-bold text-fg">
          {existing ? 'Edit registration' : 'New registration'} — {section.displayName}
        </h4>
      )}

      {/* ── Who ─────────────────────────────────────────────────────── */}
      {mode === 'guest' ? (
        <fieldset className="grid gap-3">
          <legend className="mb-1 font-sans text-sm font-medium text-fg">
            Your details <span className="text-destructive">*</span>
          </legend>
          {guest && onGuestChange && (
            <GuestContactForm
              idPrefix={`${idPrefix}-guest`}
              guest={guest}
              addressRequired={addressRequired}
              onChange={onGuestChange}
            />
          )}
          {localErrors.get('guest') && (
            <p role="alert" className="font-sans text-xs text-destructive">
              {localErrors.get('guest')}
            </p>
          )}
        </fieldset>
      ) : existing ? (
        <p className="font-sans text-sm text-fg">
          For <strong>{existing.attendeeLabel}</strong>
        </p>
      ) : (
        <fieldset className="grid gap-2">
          <legend className="mb-1 font-sans text-sm font-medium text-fg">
            Who is this for? <span className="text-destructive">*</span>
            <span className="ml-2 font-normal text-muted-fg">Pick everyone who is coming.</span>
          </legend>
          <div className="grid gap-1.5">
            {members.map((m) => {
              const eligibility = m.eligibility.find((e) => e.sectionKey === section.key);
              const eligible = eligibility?.eligible ?? false;
              const taken = takenIdentities.has(`c${m.contactId}`);
              const disabled = !eligible || taken;
              const id = `${idPrefix}-who-${m.contactId}`;
              const view = views.find((v) => v.key === `c${m.contactId}`);
              return (
                <div key={m.contactId} className="grid">
                  <label
                    htmlFor={id}
                    className={`inline-flex min-h-11 items-center gap-2 py-2 font-sans text-sm select-none @min-[768px]:min-h-0 @min-[768px]:py-0 ${
                      disabled ? 'cursor-not-allowed text-muted-fg' : 'cursor-pointer text-fg'
                    }`}
                  >
                    <input
                      id={id}
                      type="checkbox"
                      disabled={disabled}
                      checked={selected.has(m.contactId)}
                      onChange={(e) => toggleMember(m, e.target.checked)}
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
                  {view && renderDrawer(view)}
                </div>
              );
            })}
            {canAddMember && (
              <div className="grid">
                <label
                  htmlFor={`${idPrefix}-who-new`}
                  className="inline-flex min-h-11 cursor-pointer items-center gap-2 py-2 font-sans text-sm text-fg select-none @min-[768px]:min-h-0 @min-[768px]:py-0"
                >
                  <input
                    id={`${idPrefix}-who-new`}
                    type="checkbox"
                    checked={addNew}
                    onChange={(e) => toggleAddNew(e.target.checked)}
                    className="size-4 shrink-0 cursor-pointer accent-primary"
                  />
                  Someone not listed — add a family member
                </label>
                {addNew &&
                  views.some((v) => v.key === 'new') &&
                  renderDrawer(views.find((v) => v.key === 'new')!)}
              </div>
            )}
          </div>
          {localErrors.get('who') && (
            <p role="alert" className="font-sans text-xs text-destructive">
              {localErrors.get('who')}
            </p>
          )}
        </fieldset>
      )}

      {/* ── Price ──────────────────────────────────────────────────── */}
      {product && showPrices && (
        <p className="font-sans text-sm text-fg">
          Registration price: <strong>{formatPrice(product.basePrice)}</strong>
          {multi && product.basePrice > 0 && (
            <span className="text-muted-fg"> each · {views.length} people</span>
          )}
          {product.depositPrice !== null && (
            <span className="text-muted-fg">
              {' '}
              · deposit option {formatPrice(product.depositPrice)}
            </span>
          )}
        </p>
      )}
      <RichText html={product?.descriptionHtml} className="text-sm text-muted-fg" />

      {!drawerMode && views.map((view, index) => renderPerson(view, index))}

      {serverErrorsGeneral.length > 0 && (
        <ul role="alert" className="grid gap-1 font-sans text-sm text-destructive">
          {serverErrorsGeneral.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}

      <div
        className={
          embedded
            ? 'sticky bottom-0 -mx-4 flex flex-col gap-2 border-t border-border bg-bg px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] @min-[480px]:flex-row @min-[480px]:justify-end'
            : // Right-aligned like the card's add button (2026-09-22).
              'flex flex-wrap justify-end gap-3'
        }
      >
        <Button type="submit" size="lg" className={embedded ? 'w-full @min-[480px]:w-auto' : ''}>
          {saveLabel}
        </Button>
        {!embedded && (
          <Button type="button" variant="outline" size="lg" onClick={onCancel}>
            Cancel
          </Button>
        )}
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
