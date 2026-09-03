import * as React from 'react';
import { MotionConfig } from 'framer-motion';
import { useCreatePledge } from '@perimeter/api-hooks';
import { PledgeForm } from './components/PledgeForm';
import { PledgeConfirmation } from './components/PledgeConfirmation';
import type { FrontierPledgeConfig, PledgeFormErrors, PledgeFormValues } from './types';
import { buildPledgeNotes, emptyPledgeForm, parseAmount, validatePledgeForm } from './lib/pledge';

export interface AppProps {
  config: FrontierPledgeConfig;
}

export function App({ config }: AppProps): React.JSX.Element {
  const [values, setValues] = React.useState<PledgeFormValues>(emptyPledgeForm);
  const [errors, setErrors] = React.useState<PledgeFormErrors>({});
  const submit = useCreatePledge();

  function handleChange(field: keyof PledgeFormValues, value: string): void {
    setValues((prev) => ({ ...prev, [field]: value }));
    // Clear this field's message as soon as it is edited: re-running the whole
    // validator here would light up every other empty field mid-typing.
    setErrors((prev) => (field in prev ? { ...prev, [field]: undefined } : prev));
  }

  function handleSubmit(): void {
    const found = validatePledgeForm(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const amount = parseAmount(values.amount);
    // Unreachable once the validator passes; narrows the null for TypeScript.
    if (amount === null) return;

    const spouse = values.spouse.trim();
    submit.mutate({
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      pledge: amount,
      notes: buildPledgeNotes(values),
      ...(spouse ? { spouse } : {}),
    });
  }

  function handleReset(): void {
    submit.reset();
    setValues(emptyPledgeForm);
    setErrors({});
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="@container bg-surface-dark text-left text-surface-dark-fg">
        {/* `relative` is the positioning context the confirmation covers. */}
        <div className="relative flex flex-col items-center px-4 py-8 @xl:py-16">
          <header className="mb-6 text-center @xl:mb-10">
            <h2 className="font-serif text-4xl leading-tight font-normal text-balance @md:text-5xl @xl:text-6xl">
              {config.heading}
            </h2>
            <p className="mt-2 text-lg font-medium text-warning @md:text-xl">{config.period}</p>
          </header>

          <PledgeForm
            values={values}
            errors={errors}
            onChange={handleChange}
            onSubmit={handleSubmit}
            submitting={submit.isPending}
            submitFailed={submit.isError}
            onDismissSubmitError={() => submit.reset()}
            amountLabel={config.amountLabel}
            inert={submit.isSuccess}
          />

          <PledgeConfirmation
            open={submit.isSuccess}
            onClose={handleReset}
            accountUrl={config.accountUrl}
          />
        </div>
      </div>
    </MotionConfig>
  );
}
