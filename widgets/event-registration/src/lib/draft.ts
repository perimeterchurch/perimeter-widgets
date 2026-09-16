import type {
  RegistrationAttendee,
  RegistrationPlanEntry,
  RegistrationPlanInput,
  RegistrationPurchaser,
} from '@perimeter/api-hooks';

/**
 * The registration draft: everything the visitor has chosen but not yet
 * submitted, kept in one reducer so "edit", "remove", and "add another" are
 * plain state transitions and the plan body is a projection of it.
 *
 * Nothing here is persisted. An abandoned draft costs nothing; MP-side
 * abandonment (a submitted but unpaid invoice) is the native cleanup job's
 * business.
 */

export interface DraftRegistration {
  /** Local id, stable across edits — not an MP id. */
  localId: string;
  sectionKey: string;
  attendee: RegistrationAttendee;
  /** Display name while the attendee has no MP record yet. */
  attendeeLabel: string;
  options: RegistrationPlanEntry['options'];
  promoCode: string | undefined;
  answers: RegistrationPlanEntry['answers'];
}

export interface GuestDetails {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: AddressDraft;
}

export interface AddressDraft {
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
}

export interface ContactDraft {
  email: string;
  phone: string;
  address: AddressDraft;
  updateMyRecord: boolean;
}

export interface Draft {
  registrations: DraftRegistration[];
  /** Which registration is open in the editor, or a new one for a section. */
  editing:
    { kind: 'none' } | { kind: 'existing'; localId: string } | { kind: 'new'; sectionKey: string };
  guest: GuestDetails;
  contact: ContactDraft;
  payDeposit: boolean;
}

export const EMPTY_ADDRESS: AddressDraft = {
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
};

export const EMPTY_DRAFT: Draft = {
  registrations: [],
  editing: { kind: 'none' },
  guest: { firstName: '', lastName: '', email: '', phone: '', address: EMPTY_ADDRESS },
  contact: { email: '', phone: '', address: EMPTY_ADDRESS, updateMyRecord: false },
  payDeposit: false,
};

export type DraftAction =
  | { type: 'start-new'; sectionKey: string }
  | { type: 'edit'; localId: string }
  | { type: 'cancel-edit' }
  | { type: 'save'; registration: DraftRegistration }
  | { type: 'save-many'; registrations: DraftRegistration[] }
  | { type: 'remove'; localId: string }
  | { type: 'set-guest'; guest: Partial<GuestDetails> }
  | { type: 'set-contact'; contact: Partial<ContactDraft> }
  | { type: 'set-pay-deposit'; payDeposit: boolean }
  | { type: 'prefill-contact'; contact: Omit<ContactDraft, 'updateMyRecord'> }
  | { type: 'reset' };

export function draftReducer(state: Draft, action: DraftAction): Draft {
  switch (action.type) {
    case 'start-new':
      return { ...state, editing: { kind: 'new', sectionKey: action.sectionKey } };
    case 'edit':
      return { ...state, editing: { kind: 'existing', localId: action.localId } };
    case 'cancel-edit':
      return { ...state, editing: { kind: 'none' } };
    case 'save': {
      const exists = state.registrations.some((r) => r.localId === action.registration.localId);
      return {
        ...state,
        editing: { kind: 'none' },
        registrations: exists
          ? state.registrations.map((r) =>
              r.localId === action.registration.localId ? action.registration : r,
            )
          : [...state.registrations, action.registration],
      };
    }
    case 'save-many': {
      // One editor pass can add several people; each is its own registration.
      let registrations = state.registrations;
      for (const registration of action.registrations) {
        registrations = registrations.some((r) => r.localId === registration.localId)
          ? registrations.map((r) => (r.localId === registration.localId ? registration : r))
          : [...registrations, registration];
      }
      return { ...state, editing: { kind: 'none' }, registrations };
    }
    case 'remove':
      return {
        ...state,
        editing:
          state.editing.kind === 'existing' && state.editing.localId === action.localId
            ? { kind: 'none' }
            : state.editing,
        registrations: state.registrations.filter((r) => r.localId !== action.localId),
      };
    case 'set-guest':
      return { ...state, guest: { ...state.guest, ...action.guest } };
    case 'set-contact':
      return { ...state, contact: { ...state.contact, ...action.contact } };
    case 'prefill-contact':
      // Only fill what the visitor hasn't typed yet.
      return {
        ...state,
        contact: {
          ...state.contact,
          email: state.contact.email || action.contact.email,
          phone: state.contact.phone || action.contact.phone,
          address: state.contact.address.line1 ? state.contact.address : action.contact.address,
        },
      };
    case 'set-pay-deposit':
      return { ...state, payDeposit: action.payDeposit };
    case 'reset':
      return EMPTY_DRAFT;
    default:
      return state;
  }
}

export function newLocalId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** Same person twice in one event is what the server refuses; sections may share an event. */
export function attendeeIdentity(attendee: RegistrationAttendee): string {
  switch (attendee.kind) {
    case 'contact':
      return `c${attendee.contactId}`;
    case 'new':
      return `n${attendee.firstName.toLowerCase()}|${attendee.lastName.toLowerCase()}|${attendee.dateOfBirth ?? ''}`;
    case 'purchaser':
      return 'purchaser';
  }
}

type PlanAddress = NonNullable<Extract<RegistrationPurchaser, { kind: 'guest' }>['address']>;

function planAddress(address: AddressDraft): PlanAddress | null {
  if (!address.line1.trim()) return null;
  const line2 = address.line2.trim();
  return {
    line1: address.line1.trim(),
    ...(line2 ? { line2 } : {}),
    city: address.city.trim(),
    state: address.state.trim(),
    postalCode: address.postalCode.trim(),
  };
}

/** The plan body for quote and submit. */
export function buildPlan(draft: Draft, signedIn: boolean): RegistrationPlanInput {
  const guestAddress = planAddress(draft.guest.address);
  const purchaser: RegistrationPurchaser = signedIn
    ? { kind: 'session' }
    : {
        kind: 'guest',
        firstName: draft.guest.firstName.trim(),
        lastName: draft.guest.lastName.trim(),
        email: draft.guest.email.trim(),
        phone: draft.guest.phone.trim(),
        ...(guestAddress ? { address: guestAddress } : {}),
      };

  const contactEmail = draft.contact.email.trim();
  const contactPhone = draft.contact.phone.trim();
  const contactAddress = planAddress(draft.contact.address);
  const contact: NonNullable<RegistrationPlanInput['contact']> = {
    ...(contactEmail ? { email: contactEmail } : {}),
    ...(contactPhone ? { phone: contactPhone } : {}),
    ...(contactAddress ? { address: contactAddress } : {}),
  };

  return {
    purchaser,
    registrations: draft.registrations.map((r): RegistrationPlanEntry => {
      const promoCode = r.promoCode?.trim();
      return {
        sectionKey: r.sectionKey,
        attendee: r.attendee,
        options: r.options,
        ...(promoCode ? { promoCode } : {}),
        answers: r.answers.filter((a) => a.response.trim().length > 0),
      };
    }),
    payDeposit: draft.payDeposit,
    updateMyRecord: signedIn && draft.contact.updateMyRecord,
    ...(signedIn ? { contact } : {}),
  };
}
