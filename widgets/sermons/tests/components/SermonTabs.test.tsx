/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { SermonTabs } from '../../src/components/SermonTabs';

/**
 * The sermons/series tab row must read as clearly selected in both light and
 * dark. We use the `@perimeter/ui` Tabs `line` variant (a per-instance prop, so
 * the shared inspector tabs are untouched) which renders an underline indicator
 * and a `data-active` trigger. These tests assert the structural markers that
 * back the visible selected state; the actual contrast is a manual studio check.
 */
describe('SermonTabs selected state', () => {
  it('uses the line variant TabsList (renders the underline indicator)', () => {
    const { container } = render(<SermonTabs activeTab="sermons" onTabChange={() => {}} />);

    const list = container.querySelector('[data-slot="tabs-list"]');
    expect(list).not.toBeNull();
    // The per-instance line variant — NOT the shared default — drives the
    // underline indicator and avoids restyling the inspector tabs.
    expect(list?.getAttribute('data-variant')).toBe('line');

    const indicator = container.querySelector('[data-slot="tabs-indicator"]');
    expect(indicator).not.toBeNull();
  });

  it('marks exactly the active trigger with data-active (selected-state hook)', () => {
    const { container } = render(<SermonTabs activeTab="series" onTabChange={() => {}} />);

    const triggers = Array.from(
      container.querySelectorAll<HTMLElement>('[data-slot="tabs-trigger"]'),
    );
    expect(triggers.length).toBe(2);

    const active = triggers.filter((t) => t.hasAttribute('data-active'));
    const inactive = triggers.filter((t) => !t.hasAttribute('data-active'));
    // Exactly one active, one inactive — the data-active marker is what the
    // variant's active styling + underline indicator hang off of.
    expect(active.length).toBe(1);
    expect(inactive.length).toBe(1);

    // The active trigger is the one matching the activeTab value ("series").
    expect(active[0]?.textContent).toContain('Series');
    expect(inactive[0]?.textContent).toContain('Sermons');
  });
});
