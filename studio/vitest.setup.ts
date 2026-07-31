import { configure } from '@testing-library/react';

/**
 * Raise Testing Library's async budget for the whole studio suite.
 *
 * Studio tests routinely wait on REAL lazy imports rather than state flushes — a
 * widget definition, an MDX doc chunk, the inspector fields built from a
 * definition — each going through vitest's transform pipeline. On a 2-core CI
 * runner sharing cores with every other package's suite, those exceed
 * `waitFor`/`findBy`'s 1s default, and the failure is indistinguishable from a
 * real bug: "Unable to find role=textbox".
 *
 * Two CI-only failures were fixed one call site at a time before this existed
 * (GuidePage's doc wait, then the deeplink suite's inspector wait), which is a
 * losing game: every new `waitFor` in a page test starts out flaky and only
 * announces it on someone else's PR. 10s is the value those call sites had
 * settled on, and it sits under the 20s `testTimeout` in vite.config.ts so a
 * blown wait still fails as a wait, not as a test timeout.
 *
 * This is a floor, not a ceiling: a call site with an explicit `{ timeout }`
 * still wins. Raising it costs nothing on green runs — `waitFor` polls until it
 * succeeds, so the budget only matters when something is actually broken.
 */
configure({ asyncUtilTimeout: 10_000 });
