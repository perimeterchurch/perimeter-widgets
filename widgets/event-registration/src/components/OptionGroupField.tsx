import * as React from 'react';
import type { RegistrationOptionGroup, RegistrationPlanEntry } from '@perimeter/api-hooks';
import { Input } from '@perimeter/ui/input';
import { Label } from '@perimeter/ui/label';
import { RichText } from './RichText';
import { formatPrice } from '../lib/format';

type Selection = RegistrationPlanEntry['options'][number];

export interface OptionGroupFieldProps {
  group: RegistrationOptionGroup;
  idPrefix: string;
  selections: Selection[];
  onChange: (next: Selection[]) => void;
}

function priceLabel(price: number): string {
  if (price === 0) return '';
  return price < 0 ? `−${formatPrice(-price)}` : `+${formatPrice(price)}`;
}

/**
 * One `Product_Option_Groups` row, exactly as the native widget renders it:
 * radios when `Mutually_Exclusive` (with a "Not selected" choice when the
 * group is optional), checkboxes otherwise; a quantity select when
 * `Qty_Allowed > 1`; grayed out at `Remaining <= 0`; a note box when the group
 * has a `Note_Label`. Promo-code rows never appear here.
 */
export function OptionGroupField({
  group,
  idPrefix,
  selections,
  onChange,
}: OptionGroupFieldProps): React.JSX.Element | null {
  const prices = group.prices.filter((p) => !p.hidden && !p.isPromo);
  if (prices.length === 0) return null;

  const inGroup = selections.filter((s) =>
    prices.some((p) => p.productOptionPriceId === s.productOptionPriceId),
  );
  const outsideGroup = selections.filter(
    (s) => !prices.some((p) => p.productOptionPriceId === s.productOptionPriceId),
  );

  function setGroupSelections(next: Selection[]): void {
    onChange([...outsideGroup, ...next]);
  }

  function toggle(priceId: number, checked: boolean): void {
    const price = prices.find((p) => p.productOptionPriceId === priceId);
    if (!price) return;
    if (group.mutuallyExclusive) {
      setGroupSelections(
        checked ? [{ productOptionPriceId: priceId, quantity: price.minQty }] : [],
      );
      return;
    }
    if (checked) {
      setGroupSelections([...inGroup, { productOptionPriceId: priceId, quantity: price.minQty }]);
    } else {
      setGroupSelections(inGroup.filter((s) => s.productOptionPriceId !== priceId));
    }
  }

  function setQuantity(priceId: number, quantity: number): void {
    setGroupSelections(
      inGroup.map((s) => (s.productOptionPriceId === priceId ? { ...s, quantity } : s)),
    );
  }

  function setNote(priceId: number, note: string): void {
    setGroupSelections(
      inGroup.map((s) => {
        if (s.productOptionPriceId !== priceId) return s;
        const base = { productOptionPriceId: s.productOptionPriceId, quantity: s.quantity };
        return note ? { ...base, note } : base;
      }),
    );
  }

  const noneSelected = inGroup.length === 0;

  return (
    <fieldset className="grid gap-2 border border-border p-4">
      <legend className="px-1 font-sans text-base font-bold text-fg">
        {group.name}
        {group.required && <span className="text-destructive"> *</span>}
      </legend>
      <RichText html={group.descriptionHtml} className="text-sm text-muted-fg" />
      {group.exhausted && group.required && (
        <p className="text-sm text-destructive" role="alert">
          Every choice in this group is sold out.
        </p>
      )}

      <ul className="grid gap-2">
        {group.mutuallyExclusive && !group.required && (
          <li>
            <label
              htmlFor={`${idPrefix}-none`}
              className="inline-flex cursor-pointer items-center gap-2 font-sans text-sm text-fg select-none"
            >
              <input
                id={`${idPrefix}-none`}
                type="radio"
                name={`${idPrefix}-group`}
                checked={noneSelected}
                onChange={() => setGroupSelections([])}
                className="size-4 shrink-0 cursor-pointer accent-primary"
              />
              Not selected
            </label>
          </li>
        )}
        {prices.map((price) => {
          const soldOut = price.remaining !== null && price.remaining <= 0;
          const selected = inGroup.find(
            (s) => s.productOptionPriceId === price.productOptionPriceId,
          );
          const id = `${idPrefix}-${price.productOptionPriceId}`;
          const maxQty = Math.min(price.qtyAllowed, price.remaining ?? price.qtyAllowed);
          return (
            <li key={price.productOptionPriceId} className="grid gap-2">
              <label
                htmlFor={id}
                className={`inline-flex items-center gap-2 font-sans text-sm select-none ${
                  soldOut ? 'cursor-not-allowed text-muted-fg' : 'cursor-pointer text-fg'
                }`}
              >
                <input
                  id={id}
                  type={group.mutuallyExclusive ? 'radio' : 'checkbox'}
                  name={group.mutuallyExclusive ? `${idPrefix}-group` : undefined}
                  checked={selected !== undefined}
                  disabled={soldOut}
                  onChange={(e) => toggle(price.productOptionPriceId, e.target.checked)}
                  className="size-4 shrink-0 accent-primary"
                />
                <span className={soldOut ? 'line-through' : ''}>{price.title}</span>
                {priceLabel(price.price) && (
                  <span className="text-muted-fg">{priceLabel(price.price)}</span>
                )}
                {soldOut ? (
                  <span className="text-xs text-destructive">Sold out</span>
                ) : price.remaining !== null && price.remaining <= 10 ? (
                  <span className="text-xs text-muted-fg">{price.remaining} left</span>
                ) : null}
              </label>

              {selected && price.qtyAllowed > 1 && (
                <div className="ml-6 flex items-center gap-2">
                  <Label htmlFor={`${id}-qty`} className="text-xs">
                    Quantity
                  </Label>
                  <select
                    id={`${id}-qty`}
                    value={selected.quantity}
                    onChange={(e) =>
                      setQuantity(price.productOptionPriceId, Number(e.target.value))
                    }
                    className="h-8 border border-border bg-bg px-2 font-sans text-sm text-fg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
                  >
                    {Array.from(
                      { length: Math.max(0, maxQty - price.minQty + 1) },
                      (_, i) => price.minQty + i,
                    ).map((q) => (
                      <option key={q} value={q}>
                        {q}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selected && group.noteLabel && (
                <div className="ml-6 grid gap-1">
                  <Label htmlFor={`${id}-note`} className="text-xs">
                    {group.noteLabel}
                  </Label>
                  <Input
                    id={`${id}-note`}
                    value={selected.note ?? ''}
                    maxLength={500}
                    onChange={(e) => setNote(price.productOptionPriceId, e.target.value)}
                    className="max-w-md"
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
