import * as React from 'react';
import { Label } from '@perimeter/ui/label';
import { Input } from '@perimeter/ui/input';
import { Textarea } from '@perimeter/ui/textarea';
import { Button } from '@perimeter/ui/button';
import { Spinner } from '@perimeter/ui/spinner';
import { Skeleton } from '@perimeter/ui/skeleton';
import { getRecaptchaToken, loadRecaptchaV3 } from '@perimeter/widget-runtime';
import { useSubmitPrayerRequest } from '@perimeter/api-hooks';
import { PRIVACY_OPTIONS, type PrivacyChoice } from '../types';

/** reCAPTCHA action, echoed back in the server-side assessment. */
const RECAPTCHA_ACTION = 'prayer_wall';

/** Matches Feedback_Entries.Description, which the endpoint also enforces. */
const REQUEST_MAX_LENGTH = 2000;

export interface RequestFormProps {
  recaptchaSiteKey: string;
  /** True when the MP login widget has a session — the form asks for less. */
  signedIn: boolean;
  /** The signed-in visitor's name, once `/prayer-wall/me` resolves it. */
  identityName: string | undefined;
  identityLoading: boolean;
}

/**
 * The request form. Two shapes, one for each way someone arrives:
 *
 * - **signed in** — a read-only "Me" field. The server takes the submitter from
 *   the token, so there is nothing to type and nothing to get wrong.
 * - **not signed in** — first name, last name, email, which the server matches
 *   to an existing MP contact or uses to make one.
 */
export function RequestForm({
  recaptchaSiteKey,
  signedIn,
  identityName,
  identityLoading,
}: RequestFormProps): React.JSX.Element {
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [request, setRequest] = React.useState('');
  const [privacy, setPrivacy] = React.useState<PrivacyChoice>('online');
  const [notifyMe, setNotifyMe] = React.useState(false);
  const [verifying, setVerifying] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const submit = useSubmitPrayerRequest();

  // Warm the reCAPTCHA script on mount so the token is ready when someone
  // finishes typing (and the badge-hiding style lands early). Load failures
  // surface on submit, not here.
  React.useEffect(() => {
    if (recaptchaSiteKey) void loadRecaptchaV3(recaptchaSiteKey).catch(() => {});
  }, [recaptchaSiteKey]);

  function reset(): void {
    submit.reset();
    setFirstName('');
    setLastName('');
    setEmail('');
    setRequest('');
    setPrivacy('online');
    setNotifyMe(false);
    setFormError(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setFormError(null);

    let token: string;
    setVerifying(true);
    try {
      token = await getRecaptchaToken(recaptchaSiteKey, RECAPTCHA_ACTION);
    } catch {
      setVerifying(false);
      setFormError('Could not verify your request. Please refresh and try again.');
      return;
    }
    setVerifying(false);

    submit.mutate({
      request: request.trim(),
      privacy,
      notifyMe,
      recaptchaToken: token,
      // A signed-in submitter's identity comes from the token; sending name
      // fields as well would be noise the server ignores.
      ...(signedIn
        ? {}
        : {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim(),
          }),
    });
  }

  if (submit.isSuccess) {
    return (
      <div className="grid gap-4">
        <p className="font-sans text-base font-bold text-fg">Your request has been received.</p>
        <p className="font-sans text-base text-muted-fg">
          {privacy === 'staff'
            ? 'Our staff and shepherding team will be praying with you.'
            : 'It will appear on the wall once our staff have reviewed it. Thank you for sharing.'}
        </p>
        <div>
          <Button type="button" variant="secondary" size="lg" onClick={reset}>
            OK
          </Button>
        </div>
      </div>
    );
  }

  const pending = verifying || submit.isPending;

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="grid gap-5">
      {signedIn ? (
        <div className="grid gap-2">
          <Label htmlFor="prayer-wall-me">Me</Label>
          {identityLoading ? (
            <Skeleton className="h-9 w-full max-w-md" />
          ) : (
            <Input
              id="prayer-wall-me"
              value={identityName ?? ''}
              readOnly
              disabled
              className="max-w-md"
            />
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-2">
            <Label htmlFor="prayer-wall-first-name">First Name</Label>
            <Input
              id="prayer-wall-first-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              maxLength={50}
              autoComplete="given-name"
              className="max-w-md"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="prayer-wall-last-name">Last Name</Label>
            <Input
              id="prayer-wall-last-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              maxLength={50}
              autoComplete="family-name"
              className="max-w-md"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="prayer-wall-email">Email</Label>
            <Input
              id="prayer-wall-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              maxLength={254}
              autoComplete="email"
              className="max-w-md"
            />
          </div>
        </>
      )}

      <div className="grid gap-2">
        <Label htmlFor="prayer-wall-request">Request</Label>
        <Textarea
          id="prayer-wall-request"
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          required
          maxLength={REQUEST_MAX_LENGTH}
          rows={5}
        />
      </div>

      <fieldset className="grid gap-2">
        <legend className="mb-2 font-sans text-base font-bold text-fg">Privacy</legend>
        {PRIVACY_OPTIONS.map((option) => (
          <label
            key={option.value}
            htmlFor={`prayer-wall-privacy-${option.value}`}
            className="inline-flex cursor-pointer items-center gap-2 font-sans text-base text-fg select-none"
          >
            <input
              id={`prayer-wall-privacy-${option.value}`}
              type="radio"
              name="prayer-wall-privacy"
              value={option.value}
              checked={privacy === option.value}
              onChange={() => setPrivacy(option.value)}
              className="size-4 shrink-0 cursor-pointer accent-primary"
            />
            {option.label}
          </label>
        ))}
      </fieldset>

      <fieldset className="grid gap-2">
        <legend className="mb-2 font-sans text-base font-bold text-fg">Notify</legend>
        <label
          htmlFor="prayer-wall-notify"
          className="inline-flex cursor-pointer items-center gap-2 font-sans text-base text-fg select-none"
        >
          <input
            id="prayer-wall-notify"
            type="checkbox"
            checked={notifyMe}
            onChange={() => setNotifyMe((current) => !current)}
            className="size-4 shrink-0 cursor-pointer accent-primary"
          />
          Email Me When Someone Prays
        </label>
      </fieldset>

      {(formError || submit.isError) && (
        <p className="font-sans text-sm text-destructive" role="alert">
          {formError ?? 'Something went wrong saving your request. Please try again.'}
        </p>
      )}

      <div className="grid gap-3">
        <div>
          <Button
            type="submit"
            size="lg"
            className="w-full @sm:w-auto @sm:min-w-96"
            disabled={pending}
          >
            {pending ? (
              <>
                <Spinner className="mr-2" />
                {verifying ? 'Verifying…' : 'Submitting…'}
              </>
            ) : (
              'Submit Request'
            )}
          </Button>
        </div>
        {/* Required attribution while the reCAPTCHA badge is hidden. */}
        <p className="font-sans text-xs text-muted-fg">
          This form is protected by reCAPTCHA. Google's{' '}
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            Privacy Policy
          </a>{' '}
          and{' '}
          <a
            href="https://policies.google.com/terms"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            Terms of Service
          </a>{' '}
          apply.
        </p>
      </div>
    </form>
  );
}
