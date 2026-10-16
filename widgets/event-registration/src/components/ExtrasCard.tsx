import * as React from 'react';
import type {
  RegistrationPlanInput,
  RegistrationProduct,
  RegistrationQuote,
} from '@perimeter/api-hooks';
import { OptionGroupField } from './OptionGroupField';
import { RichText } from './RichText';
import { formatMoney } from '../lib/format';

export interface ExtrasCardProps {
  product: RegistrationProduct;
  selections: RegistrationPlanInput['extras'];
  onChange: (next: RegistrationPlanInput['extras']) => void;
  showPrices: boolean;
  /** The server's pricing of the order, when a quote exists. */
  quoted: RegistrationQuote['extras'] | null;
  /** The whole quote's problems; only those about the order are shown here. */
  problems: RegistrationQuote['problems'];
}

/**
 * The hub's own product, offered once for the household (Family Night
 * pizza): quantities, no people picker. The server prices it against the
 * purchaser and writes it as one participant row on the hub, so the kitchen
 * counts it like any option (decided 2026-10-15). Renders the option groups
 * exactly as a section does, so a quantity select appears once an option is
 * ticked.
 */
export function ExtrasCard({
  product,
  selections,
  onChange,
  showPrices,
  quoted,
  problems,
}: ExtrasCardProps): React.JSX.Element {
  const headingId = `extras-${product.productId}-title`;
  const orderProblems = problems.filter(
    (p) => p.registrationIndex === null && p.details?.extras === true,
  );
  return (
    <section
      aria-labelledby={headingId}
      data-slot="extras-card"
      className="grid gap-4 border border-border bg-bg p-4 @min-[480px]:p-5"
    >
      <div className="grid gap-1">
        <h2 id={headingId} className="font-sans text-lg font-bold text-fg">
          {product.name}
        </h2>
        <RichText html={product.descriptionHtml} className="text-sm" />
      </div>

      <div className="grid gap-4">
        {product.groups.map((group) => (
          <OptionGroupField
            key={group.productOptionGroupId}
            group={group}
            idPrefix={`extras-g${group.productOptionGroupId}`}
            selections={selections}
            onChange={onChange}
          />
        ))}
      </div>

      {orderProblems.length > 0 && (
        <ul role="alert" className="grid gap-1 font-sans text-sm text-destructive">
          {orderProblems.map((p, i) => (
            <li key={i}>{p.message}</li>
          ))}
        </ul>
      )}

      {showPrices && quoted && quoted.subtotal > 0 && selections.length > 0 && (
        <p className="font-sans text-sm text-fg">
          Subtotal <span className="font-bold">{formatMoney(quoted.subtotal)}</span>
        </p>
      )}
    </section>
  );
}
