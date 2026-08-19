import * as React from 'react';
import { Label } from '@perimeter/ui/label';
import { Input } from '@perimeter/ui/input';
import { Textarea } from '@perimeter/ui/textarea';
import { Button } from '@perimeter/ui/button';
import { Spinner } from '@perimeter/ui/spinner';
import { useSubmitStaffContact } from '@perimeter/api-hooks';
import { getRecaptchaToken, loadRecaptchaV3 } from '../lib/recaptcha';

/** reCAPTCHA v3 action name (echoed back in the server-side assessment). */
const RECAPTCHA_ACTION = 'staff_contact';

interface StaffContactFormProps {
  contactGuid: string;
  recaptchaSiteKey: string;
  /** The staff member's name, shown in the success confirmation. */
  staffName: string;
}

export function StaffContactForm({
  contactGuid,
  recaptchaSiteKey,
  staffName,
}: StaffContactFormProps): React.JSX.Element {
  const [senderName, setSenderName] = React.useState('');
  const [senderEmail, setSenderEmail] = React.useState('');
  const [subject, setSubject] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [verifying, setVerifying] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const submit = useSubmitStaffContact();

  // Warm up the reCAPTCHA v3 script on mount so the token is ready quickly (and
  // the badge-hiding style is applied). Failures are surfaced only on submit.
  React.useEffect(() => {
    if (recaptchaSiteKey) void loadRecaptchaV3(recaptchaSiteKey).catch(() => {});
  }, [recaptchaSiteKey]);

  function reset(): void {
    submit.reset();
    setSenderName('');
    setSenderEmail('');
    setSubject('');
    setMessage('');
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

    const trimmedSubject = subject.trim();
    submit.mutate({
      contactGuid,
      senderName: senderName.trim(),
      senderEmail: senderEmail.trim(),
      message: message.trim(),
      recaptchaToken: token,
      ...(trimmedSubject ? { subject: trimmedSubject } : {}),
    });
  }

  if (submit.isSuccess) {
    return (
      <div className="grid gap-4 text-center">
        <p className="text-lg font-semibold text-foreground">Message sent</p>
        <p className="text-sm text-muted-foreground">
          Thanks, {senderName || 'friend'}! Your message to {staffName} is on its way.
        </p>
        <div>
          <Button type="button" variant="outline" onClick={reset}>
            Send another message
          </Button>
        </div>
      </div>
    );
  }

  const pending = verifying || submit.isPending;

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="staff-contact-name">Your Name</Label>
        <Input
          id="staff-contact-name"
          value={senderName}
          onChange={(e) => setSenderName(e.target.value)}
          required
          maxLength={100}
          autoComplete="name"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="staff-contact-email">Your Email</Label>
        <Input
          id="staff-contact-email"
          type="email"
          value={senderEmail}
          onChange={(e) => setSenderEmail(e.target.value)}
          required
          maxLength={254}
          autoComplete="email"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="staff-contact-subject">Subject</Label>
        <Input
          id="staff-contact-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={200}
          placeholder="Staff Contact Form"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="staff-contact-message">Message</Label>
        <Textarea
          id="staff-contact-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          maxLength={5000}
          rows={6}
        />
      </div>

      {(formError || submit.isError) && (
        <p className="text-sm text-destructive" role="alert">
          {formError ?? 'Something went wrong sending your message. Please try again.'}
        </p>
      )}

      <div className="grid gap-3">
        <div>
          <Button type="submit" disabled={pending}>
            {pending ? (
              <>
                <Spinner className="mr-2" />
                {verifying ? 'Verifying…' : 'Sending…'}
              </>
            ) : (
              'Send'
            )}
          </Button>
        </div>
        {/* Required attribution when the reCAPTCHA badge is hidden. */}
        <p className="text-xs text-muted-foreground">
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
