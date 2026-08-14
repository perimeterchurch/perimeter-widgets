import * as React from 'react';
import { Label } from '@perimeter/ui/label';
import { Input } from '@perimeter/ui/input';
import { Textarea } from '@perimeter/ui/textarea';
import { Button } from '@perimeter/ui/button';
import { Spinner } from '@perimeter/ui/spinner';
import { useSubmitStaffContact } from '@perimeter/api-hooks';
import { Recaptcha, type RecaptchaHandle } from './Recaptcha';

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
  const [token, setToken] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const recaptchaRef = React.useRef<RecaptchaHandle>(null);
  const submit = useSubmitStaffContact();

  function reset(): void {
    submit.reset();
    setSenderName('');
    setSenderEmail('');
    setSubject('');
    setMessage('');
    setToken(null);
    setFormError(null);
    recaptchaRef.current?.reset();
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setFormError(null);
    if (!token) {
      setFormError('Please complete the reCAPTCHA to send your message.');
      return;
    }
    const trimmedSubject = subject.trim();
    submit.mutate(
      {
        contactGuid,
        senderName: senderName.trim(),
        senderEmail: senderEmail.trim(),
        message: message.trim(),
        recaptchaToken: token,
        ...(trimmedSubject ? { subject: trimmedSubject } : {}),
      },
      {
        onError: () => {
          // Tokens are single-use — clear it so the visitor re-checks before retrying.
          recaptchaRef.current?.reset();
          setToken(null);
        },
      },
    );
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

  const pending = submit.isPending;

  return (
    <form onSubmit={handleSubmit} className="grid gap-4" noValidate={false}>
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

      <Recaptcha ref={recaptchaRef} siteKey={recaptchaSiteKey} onChange={setToken} />

      {(formError || submit.isError) && (
        <p className="text-sm text-destructive" role="alert">
          {formError ?? 'Something went wrong sending your message. Please try again.'}
        </p>
      )}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? (
            <>
              <Spinner className="mr-2" />
              Sending…
            </>
          ) : (
            'Send'
          )}
        </Button>
      </div>
    </form>
  );
}
