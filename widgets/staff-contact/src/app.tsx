import * as React from 'react';
import { useStaffMember } from '@perimeter/api-hooks';
import { Spinner } from '@perimeter/ui/spinner';
import { Label } from '@perimeter/ui/label';
import { Input } from '@perimeter/ui/input';
import type { StaffContactConfig } from './types';
import { StaffContactForm } from './components/StaffContactForm';
import { staffPhotoUrl } from './lib/api';

export interface AppProps {
  config: StaffContactConfig;
}

export function App({ config }: AppProps): React.JSX.Element {
  const { recaptchaSiteKey, apiUrl } = config;
  // Dev-only: let a tester paste a Contact GUID right in the studio preview
  // instead of opening the Inspector. `import.meta.env.DEV` is statically false
  // in the production bundle, so this whole affordance is tree-shaken out.
  const [devGuid, setDevGuid] = React.useState(config.contactGuid);
  const contactGuid = import.meta.env.DEV ? devGuid : config.contactGuid;

  const query = useStaffMember(contactGuid, { enabled: Boolean(contactGuid) });

  let content: React.JSX.Element;

  if (!contactGuid) {
    content = (
      <Notice
        title="Contact form unavailable"
        body="This staff contact form is missing the staff member it should reach. Please go back and try again."
      />
    );
  } else if (query.isLoading) {
    content = (
      <div className="flex justify-center py-10 text-muted-foreground">
        <Spinner className="size-6" />
      </div>
    );
  } else if (query.isError || !query.data) {
    content = (
      <Notice
        title="Staff member not found"
        body="We couldn't find that staff member. They may no longer be listed. Please go back and choose someone from the staff directory."
      />
    );
  } else {
    const member = query.data.data;
    content = (
      <>
        <header className="flex flex-col items-center gap-2 text-center">
          <StaffPhoto contactGuid={contactGuid} apiUrl={apiUrl} name={member.name} />
          <h2 className="text-xl font-semibold text-foreground">{member.name}</h2>
          {member.jobTitle && <p className="text-sm text-muted-foreground">{member.jobTitle}</p>}
        </header>
        <StaffContactForm
          contactGuid={contactGuid}
          recaptchaSiteKey={recaptchaSiteKey}
          staffName={member.name}
        />
      </>
    );
  }

  return (
    <div className="mx-auto grid max-w-xl gap-6 p-4">
      {import.meta.env.DEV && <DevGuidField value={devGuid} onChange={setDevGuid} />}
      {content}
    </div>
  );
}

interface DevGuidFieldProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Dev-only helper (studio preview): paste a Contact GUID to preview the widget
 * for that staff member without opening the Inspector. Not shipped — the caller
 * only renders it under `import.meta.env.DEV`.
 */
function DevGuidField({ value, onChange }: DevGuidFieldProps): React.JSX.Element {
  return (
    <div className="grid gap-2 rounded-md border border-dashed border-muted-foreground/40 bg-muted/40 p-3">
      <Label
        htmlFor="staff-contact-dev-guid"
        className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
      >
        Dev · Contact GUID
      </Label>
      <Input
        id="staff-contact-dev-guid"
        value={value}
        onChange={(e) => onChange(e.target.value.trim())}
        placeholder="Paste a Contact GUID to preview"
        spellCheck={false}
        autoComplete="off"
      />
    </div>
  );
}

interface StaffPhotoProps {
  contactGuid: string;
  apiUrl?: string | undefined;
  name: string;
}

/** Staff headshot with an initials fallback when the photo 404s or fails. */
function StaffPhoto({ contactGuid, apiUrl, name }: StaffPhotoProps): React.JSX.Element {
  const [failed, setFailed] = React.useState(false);

  if (failed) {
    return (
      <div
        className="flex size-24 items-center justify-center rounded-full bg-muted text-xl font-medium text-muted-foreground"
        aria-hidden="true"
      >
        {initials(name)}
      </div>
    );
  }

  return (
    <img
      src={staffPhotoUrl(contactGuid, apiUrl)}
      alt={name}
      className="size-24 rounded-full object-cover"
      onError={() => setFailed(true)}
    />
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

interface NoticeProps {
  title: string;
  body: string;
}

function Notice({ title, body }: NoticeProps): React.JSX.Element {
  return (
    <div className="grid gap-1 py-8 text-center">
      <p className="text-lg font-semibold text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
