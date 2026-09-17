/**
 * Small in-memory event-registration API fixture for the visual harness: the
 * Family Night shape `GET /api/registration/events/{id}` returns, trimmed to
 * what the layout needs (three sections, one with a price and an opt-in
 * prompt). The studio is signed out under Playwright, so the roster endpoint
 * is never requested and Add opens the guest path.
 */

function section(over: {
  key: string;
  relatedEventId: number;
  displayName: string;
  eventId: number;
  minorRegistration: boolean;
  position: number;
  basePrice?: number;
  enableLabelHtml?: string | null;
  buttonText?: string;
  showHouseholdPositionId?: number | null;
  remaining?: number | null;
  sectionGroup?: string | null;
}) {
  return {
    key: over.key,
    relatedEventId: over.relatedEventId,
    displayName: over.displayName,
    enableLabelHtml: over.enableLabelHtml ?? null,
    instructionsHtml: '<p>Meet in the Fellowship Hall ten minutes early.</p>',
    buttonText: over.buttonText ?? 'Add registrant',
    sectionGroup: over.sectionGroup ?? null,
    position: over.position,
    showHouseholdPositionId: over.showHouseholdPositionId ?? null,
    forGenderId: null,
    isParentEvent: false,
    audience: {
      minAge: null,
      maxAge: null,
      minGrade: null,
      maxGrade: null,
      genderId: null,
      householdPositionId: null,
      minorsOnly: over.minorRegistration,
      adultsOnly: false,
    },
    event: {
      eventId: over.eventId,
      title: over.displayName,
      startDate: '2026-09-27T18:00:00',
      endDate: '2026-09-27T20:00:00',
      meetingInstructionsHtml: null,
      minorRegistration: over.minorRegistration,
      participantsExpected: null,
      remaining: over.remaining ?? null,
      registrationStart: null,
      registrationEnd: null,
      externalRegistrationUrl: null,
    },
    product: {
      productId: 9000 + over.relatedEventId,
      name: over.displayName,
      descriptionHtml: null,
      basePrice: over.basePrice ?? 0,
      depositPrice: null,
      groups: [],
    },
    form: null,
    open: true,
    closedReason: null,
  };
}

export const familyNightEvent = {
  success: true as const,
  data: {
    eventId: 900001,
    title: 'Family Night',
    descriptionHtml:
      '<p>Family members split into their desired events. Parents relax with other parents while the kids have their own night.</p>',
    startDate: '2026-09-27T18:00:00',
    endDate: '2026-09-27T20:00:00',
    timeZone: 'America/New_York',
    congregationId: 1,
    imageUrl: '/api/event-image/900001',
    location: {
      name: 'Perimeter Church',
      addressLine1: '9500 Medlock Bridge Rd',
      addressLine2: null,
      city: 'Johns Creek',
      state: 'GA',
      postalCode: '30097',
      directionsUrl: 'https://maps.google.com/maps?daddr=9500%20Medlock%20Bridge%20Rd',
      rooms: [],
    },
    primaryContact: { displayName: 'Ryan Nickell', emailAddress: null },
    visibilityLevelId: 5,
    viewable: true,
    cancelled: false,
    externalRegistrationUrl: null,
    viewer: {
      signedIn: false,
      contactId: null,
      loginRequired: false,
      canGuestRegister: true,
      isStaff: false,
    },
    registrationOpen: true,
    sections: [
      section({
        key: 'related:101',
        relatedEventId: 101,
        displayName: 'Parent Gathering',
        eventId: 900011,
        minorRegistration: false,
        position: 1,
        showHouseholdPositionId: 1,
        sectionGroup: 'Adults',
      }),
      section({
        key: 'related:103',
        relatedEventId: 103,
        displayName: 'Student Night of Worship (Grades 6-12)',
        eventId: 900013,
        minorRegistration: true,
        position: 3,
        basePrice: 10,
        enableLabelHtml: '<b>Registering a student?</b>',
        buttonText: 'Add a student',
        remaining: 5,
        sectionGroup: 'Kids',
      }),
      section({
        key: 'related:104',
        relatedEventId: 104,
        displayName: 'Elementary Active (Grades K-5)',
        eventId: 900014,
        minorRegistration: true,
        position: 4,
        sectionGroup: 'Kids',
      }),
    ],
  },
};

/** What `POST …/submit` returns for that free registration. */
export const parentGatheringSubmit = {
  success: true as const,
  data: {
    dryRun: false,
    idempotencyKey: 'fixture',
    replayed: false,
    invoiceId: 1,
    invoiceGuid: 'fixture-guid',
    invoiceTotal: 0,
    invoiceStatusId: 1,
    checkoutUrl: 'https://www.perimeter.org/event-checkout/?id=fixture-guid',
    participants: [],
    get quote() {
      return parentGatheringQuote.data;
    },
  },
};

/** The quote for a guest registering themself for the Parent Gathering. */
export const parentGatheringQuote = {
  success: true as const,
  data: {
    eventId: 900001,
    registrations: [
      {
        registrationIndex: 0,
        sectionKey: 'related:101',
        eventId: 900011,
        contactId: null,
        attendeeName: 'Sam Guest',
        isMinor: false,
        lines: [
          {
            kind: 'base',
            productId: 9101,
            productOptionPriceId: null,
            title: 'Parent Gathering',
            quantity: 1,
            unitPrice: 0,
            lineTotal: 0,
            itemNote: null,
            depositRequested: false,
          },
        ],
        subtotal: 0,
        optionsSummary: null,
        answerSummary: null,
        attendingOnline: false,
        addsToGroupIds: [],
        overlapsWithRegistrationIndexes: [],
        resolvedOptions: [],
      },
    ],
    invoiceTotal: 0,
    depositRequested: false,
    participationStatusId: 2,
    invoiceStatusId: 1,
    addressRequired: false,
    problems: [],
    submittable: true,
    quoteHash: 'fixture',
  },
};
