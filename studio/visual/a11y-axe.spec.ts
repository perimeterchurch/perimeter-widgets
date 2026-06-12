import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {
  STUDIO_URL,
  PREVIEW_HOST,
  mockSermonsApi,
  waitForShadowMount,
  waitForResultsLoaded,
  setWidgetTheme,
} from './helpers';

/**
 * Automated axe-core sweep over the sermons widget in both themes — the same
 * engine Storybook's a11y addon and Chromatic use (adopted from the 2026-06-10
 * platform tooling audit). axe pierces open shadow roots natively, so scoping
 * the scan to the preview host audits the widget tree itself, not the studio
 * chrome around it.
 *
 * Scope notes:
 *  - wcag2a/wcag2aa rule tags only — the documented-stable subset; automated
 *    axe catches roughly half of WCAG issues, so this is a floor, not a cert.
 *  - Scanned in BOTH themes because color-contrast is theme-dependent (the
 *    dark-surface bug class this audit round started from).
 *  - Animations must settle before analyze: the widget's AnimatePresence
 *    entrance fades leave ancestors at fractional opacity for ~200ms, and axe
 *    composites that opacity into its measured foreground color — mid-fade
 *    scans report phantom contrast failures with colors that exist on no
 *    settled frame.
 */

/** Condition-based settle: no element inside the widget shadow root is mid-fade. */
async function waitForAnimationsSettled(page: import('@playwright/test').Page): Promise<void> {
  await page.waitForFunction(
    (sel) => {
      const root = (document.querySelector(sel) as HTMLElement | null)?.shadowRoot;
      if (!root) return false;
      // framer-motion drives fades via inline style.opacity; settled = none < 1.
      const animating = root.querySelectorAll<HTMLElement>('[style*="opacity"]');
      for (const el of animating) {
        const o = getComputedStyle(el).opacity;
        if (o !== '' && Number(o) < 1) return false;
      }
      return true;
    },
    PREVIEW_HOST,
    { timeout: 10_000 },
  );
}
async function widgetViolations(page: import('@playwright/test').Page) {
  const results = await new AxeBuilder({ page })
    .include(PREVIEW_HOST)
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  return results.violations;
}

/** Human-readable digest so a failure names the rule, impact, and offending nodes. */
function digest(violations: Awaited<ReturnType<typeof widgetViolations>>) {
  return violations
    .map(
      (v) =>
        `${v.id} (${v.impact}): ${v.help}\n` +
        v.nodes.map((n) => `  - ${n.target.join(' ')}`).join('\n'),
    )
    .join('\n');
}

test.describe('axe-core: sermons widget has no WCAG A/AA violations', () => {
  test.beforeEach(async ({ page }) => {
    await mockSermonsApi(page);
    await page.goto(`${STUDIO_URL}/widgets/sermons`);
    await waitForShadowMount(page);
    await waitForResultsLoaded(page);
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`${theme} theme`, async ({ page }) => {
      await setWidgetTheme(page, theme);
      await waitForAnimationsSettled(page);
      const violations = await widgetViolations(page);
      expect(violations, `axe violations in ${theme}:\n${digest(violations)}`).toEqual([]);
    });
  }
});
