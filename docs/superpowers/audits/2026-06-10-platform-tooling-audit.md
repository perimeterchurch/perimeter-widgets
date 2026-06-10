# Widget Platform Tooling Audit — 2026-06-10

**Question:** Are the systems we use to create, update, design, style, and release/host
embeddable widgets (for WordPress and other host sites) the best tools and processes
available — or are there better solutions?

**Method:** A ground-truth codebase audit, then two adversarially-verified deep-research
rounds (10 search angles, 46 sources fetched, 226 claims extracted, 50 claims verified by
3-vote adversarial panels — 48 confirmed, 2 refuted) plus a targeted follow-up on the
component-workshop question. Every load-bearing claim below carries a source. Research
currency: June 2026.

**Hard constraint applied throughout:** shadow-DOM style isolation from hostile host-page
CSS is non-negotiable. Every alternative was evaluated against it.

---

## Executive summary

**The platform is broadly aligned with 2025–2026 best practice, and in one area ahead of
it.** The token-as-CSS-variables approach is Tailwind v4's canonical model, not a
workaround. The `div + mount()` IIFE embed is the same pattern Stripe Elements uses. The
custom studio solves a problem (shadow-root component workshop) that no off-the-shelf tool
has solved. Turborepo remains a mainstream choice whose gaps our custom tooling already
fills.

The genuine improvement opportunities, in priority order:

1. **WordPress cache-plugin hardening** (cheap, urgent before cutover) — WP Rocket's
   "Delay JavaScript Execution" silently breaks third-party embeds; our loader needs
   `nowprocket` guidance and documented exclusions.
2. **Token scale expansion** (evolutionary) — 19 tokens covers color/radius/font but not
   spacing, shadows, or a typography scale; Tailwind v4 gives a first-party path.
3. **a11y automation** (cheap) — axe-core drops into the existing Playwright harness.
4. **Changesets evaluation** (moderate) — purpose-built versioning/changelog automation the
   custom release pipeline currently does by hand.
5. **Visual-regression baselines** (spike first) — Argos or Playwright `toHaveScreenshot`;
   no SaaS tool has *verified* shadow-DOM fidelity, so test before buying.

What we should explicitly **not** do: migrate the studio to Storybook, migrate Turborepo to
Nx, switch React to Preact, or adopt a Style Dictionary token pipeline today. Reasons below.

---

## Scorecard against the seven principles

| # | Principle | Grade | Notes |
|---|-----------|-------|-------|
| 1 | Maintainable for future widgets | **A−** | Single `mount()` path dev+prod, 14-file scaffold via `pnpm create-widget`, release guard rails. Docs drift is the main maintenance debt (pre-streamline pages flagged in the 2026-06-02 handoff). |
| 2 | Scales easily for multiple widgets | **B+** | Workspace-glob auto-registration scales cleanly. Two costs grow with widget count: manual version intent (no changesets) and each widget shipping its own React runtime (~60 kB min+gzip) — two widgets on one page = two Reacts. Industry hasn't solved shared embed runtimes either (research found no surviving practice), so this is an accepted trade-off, not a defect. |
| 3 | Single design system, easily adjustable/customizable | **B** | One token source feeding every widget via CSS variables; per-embed `data-theme-*` overrides; light/dark as a pure variable swap. Thin coverage: no spacing/shadow/typography tokens — widgets fall back to Tailwind defaults, which embedders cannot override per-instance. |
| 4 | Frontend for viewing components, variables, colors | **A** | Studio tokens page + live theme editor + per-component MDX docs at style.perimeter.org. This is the area where the custom build is ahead of the ecosystem (see Area 2). |
| 5 | Widgets share core components and extend them | **A−** | 18 shared components (`@perimeter/ui`), CVA variants, Base UI primitives. The Tailwind content-glob coupling (every widget must scan `packages/ui/src`) is fragile but documented and parity-tested. |
| 6 | Core components viewable in a frontend | **A−** | Auto-discovered gallery rendering through the SAME shadow-root pipeline as shipped widgets (ComponentStage), with MDX usage docs. Search is basic sidebar filtering. |
| 7 | Live-reload dev env: responsive, themes, params on the fly | **A** | Vite HMR, viewport presets + custom width, light/dark + host-sim surfaces, zod-driven config panel, live token editor, source/built toggle, shareable preview links. This matches or exceeds what Storybook toolbars provide — and works inside shadow roots, which Storybook does not. |
| — | Shadow-DOM isolation (hard requirement) | **A** | Proven in production; host-sim canvas tests the inheritance leak; the `:host` themed-surface fix (PR #116) closed the last known gap (color/font-size inheritance + unpainted background). |

---

## Area 1 — Design system & tokens

### Current state

19 tokens (14 colors, 3 radii, 2 fonts) as TypeScript constants → per-instance CSS
variables on `:host`, light/dark blocks, four-layer override precedence (global → widget →
`data-theme-*` attrs → studio runtime). No spacing/shadow/typography tokenization; no
W3C/DTCG format; no Style Dictionary.

### What the research found

- **Tailwind v4 makes CSS variables the canonical token format.** Tokens defined via
  `@theme` both generate utilities and emit runtime custom properties; v4 scales tokens
  beyond colors through dedicated namespaces (`--spacing-*`, `--shadow-*`, `--text-*`,
  `--font-weight-*`, `--tracking-*`, `--leading-*`, `--radius-*`, `--animate-*`), each
  driving generated utilities. Verified 9-0.
  ([tailwindcss.com/docs/theme](https://tailwindcss.com/docs/theme))
- **A stable vendor-neutral token standard now exists**: DTCG spec 2025.10 (Oct 28, 2025),
  with native light/dark theming via the Resolver module and a real implementer ecosystem
  (Figma, Penpot, Tokens Studio, Style Dictionary, Terrazzo). Verified 9-0.
  ([w3.org announcement](https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/))
- **But the standard toolchain is a moving target**: Style Dictionary v5 still lacks full
  2025.10 support (gradients, motion tokens, resolver module in progress). Verified 6-0.
  ([styledictionary.com/info/dtcg](https://styledictionary.com/info/dtcg/),
  [issue #1590](https://github.com/style-dictionary/style-dictionary/issues/1590))
- **The claim that hand-maintained CSS variables are inherently inferior to a
  tokens-as-data pipeline was REFUTED 0-3** in adversarial verification. The pipeline's
  value is design-tool interop (Figma sync), which we don't currently need.

### Verdict

**Keep the architecture; grow the token set.** The CSS-variable approach is first-party
Tailwind v4 practice. The gap is coverage, not architecture: spacing, shadows, and a
typography scale should become tokens where embedders plausibly want per-instance
overrides. DTCG/Style Dictionary is a **watch** item — adopt only if Figma-based design
collaboration becomes real, and only once Style Dictionary v5 fully supports 2025.10.

---

## Area 2 — Studio / component workshop

### Current state

Custom Vite app: widget previews through the production `mount()` path, component gallery
through the same shadow-root styling pipeline (ComponentStage), tokens page, live theme
editor, zod-driven config panel, viewport/theme/surface toolbars, host-sim canvas,
source/built toggle, MDX docs, shareable preview links. Deployed as the design-system site.

### What the research found

- **Storybook 9/10 strengthened the buy case generally**: 48% smaller install (10 is
  ESM-only, ~29% smaller again), with interaction tests, axe-core a11y, visual tests
  (Chromatic), and coverage built in. Verified 12-0.
  ([storybook.js.org/releases/9.0](https://storybook.js.org/releases/9.0))
- **But Storybook has no shadow-DOM story for React**: the official Tailwind recipe injects
  CSS globally into the light DOM (`preview.js`), never mentions shadow DOM or
  `adoptedStyleSheets`, and its dark-mode docs are still written against Tailwind v3
  config. Verified 11-1. ([recipe](https://storybook.js.org/recipes/tailwindcss))
- **Targeted follow-up (npm registry + GitHub issue sweep): no maintained addon or
  decorator exists** for rendering React stories inside shadow roots with constructable
  stylesheets. The closest artifact is a single Oct-2024 Medium post whose author calls the
  approach "hacky." Storybook's own shadow-DOM issues are unresolved problems (userEvent
  can't pierce shadow roots — [#31570](https://github.com/storybookjs/storybook/issues/31570);
  shortcut handling misfires — [#23790](https://github.com/storybookjs/storybook/issues/23790)).
  Adopting Storybook means re-implementing our shadow mounting as bespoke decorator code
  AND fighting test tooling that assumes light DOM.
- **The alternatives are weaker than the incumbent**: Ladle supports Vite 6/React 19 and
  has a decorator API that could wrap our mount path, but is single-maintainer with zero
  commits in 2026 ([tajo/ladle](https://github.com/tajo/ladle/releases)). Histoire revived
  for a 1.0 beta (Jan 2026) but documents only Vue 3 and Svelte — React support is
  effectively gone ([histoire releases](https://github.com/histoire-dev/histoire/releases)).

### Verdict

**Keep the studio. This is the strongest finding of the audit.** The hard requirement —
every component and widget rendered through the same shadow-root + constructable-stylesheet
pipeline that production uses — is something no workshop tool offers, and our parity
testing depends on it. The studio is not technical debt; it is the differentiator.

**Borrow Storybook's best idea instead:** integrated a11y automation. `@axe-core/playwright`
drops into the existing visual harness (same axe-core engine Storybook uses; it catches
~57% of WCAG issues automatically). Cheap, high-value.

---

## Area 3 — Embed & distribution

### Current state

IIFE bundle per widget; `loader.js` + `data-perimeter-widget` div; zod-validated `data-*`
config; immutable `cdn/<name>/<version>/` artifacts with `Cache-Control: immutable`;
`manifest.json` latest-pointer; versions pruned to 5; Vercel static hosting.

### What the research found

- **The `div + mount()` pattern is industry-mainstream**: Stripe Elements — the
  highest-profile embed product — mounts via CSS selector into a host div, not a custom
  element. Verified 3-0. ([docs.stripe.com/js/element/mount](https://docs.stripe.com/js/element/mount))
  (The broader claim that *no* vendor uses custom elements was refuted — Stripe's Buy
  Button ships as one — so custom elements remain a watch item, not a migration.)
- **Industry leaders run evergreen distribution**: Stripe.js updates continuously with only
  a major-version release train in the URL; Intercom's install is a tiny bootstrap IIFE
  loading an unversioned latest-pointer bundle. Verified 9-0. Verifiers noted our
  `loader.js` + manifest **already is** that pattern — layered over immutable artifacts,
  which is the *stricter* posture (rollback = pointer change, artifacts can never mutate
  under a host page). ([stripe versioning](https://docs.stripe.com/sdks/stripejs-versioning),
  [intercom install](https://developers.intercom.com/installing-intercom/web/installation))
- **Web Components as the shell**: viable but not better. r2wc renders React into an
  open/closed shadow root and supports React 19 (since v2.0.4), but does not solve CSS
  injection — we'd still ship our adoptedStyleSheets layer. Verified 3-0.
  ([bitovi/react-to-web-component](https://github.com/bitovi/react-to-web-component))
- **Declarative Shadow DOM is irrelevant to us for now**: Baseline since Aug 2024, but
  constructable stylesheets cannot be serialized into DSD markup, and the fix is unshipped
  in all browsers as of June 2026. SSR of our widgets would require abandoning
  adoptedStyleSheets. Verified 3-0. ([web.dev/articles/declarative-shadow-dom](https://web.dev/articles/declarative-shadow-dom))
- **WordPress is where embeds actually break.** WP Rocket's "Delay JavaScript Execution"
  defers ALL scripts until user interaction with no timeout fallback — in-viewport widgets
  don't render until mousemove/scroll/keydown, and never render for passive visitors. Our
  loader would NOT be auto-excluded (verified against WP Rocket's shipped
  `dynamic-lists.json`). The vendor-supported escape hatch: `data-nowprocket` on the script
  tag + published exclusion instructions — exactly what embed vendors like RB2B document.
  Verified 3-0 across four claims. A second mode (WP Rocket Delay JS + Autoptimize JS
  aggregation stripping delayed scripts entirely) verified 2-1, medium confidence.
  ([WP Rocket KB 1560](https://docs.wp-rocket.me/article/1560-delay-javascript-execution-compatibility-exclusions),
  [KB 1655](https://docs.wp-rocket.me/article/1655-troubleshoot-delay-javascript-execution-issues))
- **Bundle size**: best-in-class embed vendors keep the framework runtime in single-digit
  kB — Sentry chose Preact (4.5 kB) for its feedback widget. React 19 (`react` +
  `react-dom/client`) is ~60 kB min+gzip. But **preact/compat does not support React 19**
  (open tracking issue [preactjs#4613](https://github.com/preactjs/preact/issues/4613)), so
  the framework-swap lever is closed to us. The real sermons-bundle lever remains the
  pdf.js worker self-host (~858 → ~500–600 KiB gz, already tracked).
  ([sentry.engineering](https://sentry.engineering/blog/preact-or-svelte-an-embedded-widget-use-case/))

### Verdict

**Architecture validated; harden the WordPress edge.** The embed pattern, the immutable-CDN
+ latest-pointer hybrid, and the IIFE shell all match or exceed industry practice. The
actionable gaps are operational: cache-plugin hardening (urgent before WordPress cutover),
and a written decision on loader semantics (is `loader.js` the blessed evergreen entry
point? what are its rollback/canary semantics?). A `<perimeter-widget>` custom-element
wrapper over the same mount path is a cheap future nicety, not a need.

---

## Area 4 — Dev workflow & scaling

### Current state

Turborepo + pnpm; custom `create-widget` scaffold; custom `release` pipeline; Vitest unit
tests; Playwright studio visual specs (computed-color assertions); parity reports (dev vs
prod CSS/components); bundle-size budget tests; no changesets; no visual-diff baseline
system; no automated a11y.

### What the research found

- **Turborepo genuinely lacks release management and graph-aware codegen** — its own docs
  delegate versioning to Changesets and document `turbo gen` as Plop-style templates. Nx
  ships both built-in, but verifiers concluded neither gap justifies migration since our
  custom tools exist and work. Verified 6-0.
  ([turborepo publishing guide](https://turborepo.dev/docs/guides/publishing-libraries),
  [nx comparison](https://nx.dev/docs/guides/adopting-nx/nx-vs-turborepo))
- **Changesets is the standard versioning layer**: intent files per change, automated
  changelogs, auto-aligned internal dependents (widgets depending on `@perimeter/ui`),
  changeset-bot + GitHub Action for CI release PRs; actively maintained (releases through
  Jun 2026). Adapting it means wiring its version/changelog phases to our committed-cdn
  publish step instead of npm publish. Verified 9-0.
  ([changesets](https://github.com/changesets/changesets))
- **Visual regression options, with real costs** (all verified live 2026-06-10):
  - **Chromatic**: free 5,000 snapshots/mo but Chrome-only; $179/mo (35k) / $399/mo (85k).
    Requires Storybook stories — which we don't have. ([pricing](https://www.chromatic.com/pricing))
  - **Argos**: drops into an existing Playwright suite via a reporter + `argosScreenshot()`
    helper — the lowest-friction SaaS for us; free 5,000 screenshots/mo, $100/mo at 40k.
    ([argos-ci.com/playwright](https://argos-ci.com/playwright))
  - **Playwright `toHaveScreenshot`**: zero license cost; real maintenance overhead —
    baselines keyed per browser AND platform (macOS baselines won't match Linux CI),
    first-run seeding, same-environment generation (in practice: Docker/Linux CI).
    ([playwright.dev/docs/test-snapshots](https://playwright.dev/docs/test-snapshots))
  - **Critically: no tool has verified shadow-DOM rendering fidelity** — zero claims
    survived on that question for ANY vendor. An empirical spike (one widget, one
    screenshot per tool) answers it faster than more searching.
- **a11y automation**: Storybook's a11y story is axe-core, which is equally available to us
  as `@axe-core/playwright` in the existing harness. Automated axe catches ~57% of WCAG
  issues. Verified 3-0. ([storybook a11y docs](https://storybook.js.org/docs/writing-tests/accessibility-testing))

### Verdict

**Keep Turborepo and the custom pipeline; add the two missing layers** — changesets-style
version intent (evaluate; moderate effort) and a visual-baseline system (spike first;
Argos free tier or Playwright-native). Add axe-core now (cheap).

---

## Roadmap

### Adopt now (before/at WordPress cutover)

| # | Action | Effort | Cost | Why |
|---|--------|--------|------|-----|
| 1 | **WP cache-plugin hardening**: add `data-nowprocket` to the documented embed snippet; publish a WP Rocket/Autoptimize exclusions section in `docs/hosting-and-release.md`; consider a loader self-check (console warning when executed post-interaction-delay) | S | $0 | Verified breakage mode that silently blanks widgets for passive visitors; we control the docs the WordPress admin will follow |
| 2 | **axe-core in the visual harness**: `@axe-core/playwright` sweep over studio widget pages, both themes | S | $0 | Same engine Storybook ships; the harness already drives every state worth scanning |

### Adopt next (quarter horizon)

| # | Action | Effort | Cost | Why |
|---|--------|--------|------|-----|
| 3 | **Token scale expansion**: add spacing/shadow/typography tokens via Tailwind v4 namespaces where per-embed override is plausible; document in the tokens page | M | $0 | Closes the principle-3 gap on the first-party path; no pipeline change |
| 4 | **Visual-regression spike**: one widget, light+dark, screenshot via (a) Playwright `toHaveScreenshot` in Docker CI and (b) Argos free tier; pick based on observed shadow-DOM fidelity + review ergonomics | S spike, M adopt | $0 either way at our volume | No vendor has verified shadow-DOM fidelity; current specs assert computed colors, not pixels — a true baseline system catches what assertions miss |
| 5 | **Changesets evaluation**: prototype `changeset version` + changelog generation feeding the existing `pnpm release` publish step | M | $0 | Automates the version-intent and changelog work the pipeline does manually; keeps the committed-cdn publish |
| 6 | **Loader semantics decision doc**: bless `loader.js` + manifest as the public evergreen API; define rollback (pointer revert) and optional canary semantics | S | $0 | The Stripe/Intercom comparison showed we already have the hybrid pattern — it deserves explicit contract status |

### Hold (validated, keep as-is)

- **Custom studio** — no ecosystem replacement handles shadow-root + adoptedStyleSheets;
  Storybook would be pioneering work plus shadow-hostile test tooling; Ladle is
  maintenance-risk; Histoire dropped React.
- **Turborepo** — Nx's advantages are already covered by our custom tools.
- **IIFE + `mount()` embed shell** — Stripe-validated; custom-element wrapper is an
  optional future addition over the same path.
- **React 19** — Preact swap is closed (no React 19 compat); bundle lever is pdf.js worker
  self-host, already tracked.
- **19-token CSS-variable architecture** — first-party Tailwind v4 practice; the
  "tokens-as-data is best practice" claim was refuted under verification.

### Watch (re-check in ~6–12 months)

- **DTCG 2025.10 toolchain** — adopt only if Figma design collaboration becomes real AND
  Style Dictionary v5 (or Terrazzo) reaches full 2025.10 support.
- **Custom elements as public embed surface** — re-check whether major vendors (Calendly,
  Typeform, Stripe beyond Buy Button) move; cheap to add later.
- **Declarative adoptedStyleSheets / `@sheet`** — unshipped everywhere; if it lands, SSR
  and DSD become relevant to this architecture.
- **Storybook shadow-DOM support** — if first-class React shadow-root rendering ever
  ships, re-run the studio build-vs-buy comparison honestly.

---

## Research provenance

- Round 1 (industry baselines): 23 sources, 115 claims extracted, 25 verified → 24
  confirmed, 1 refuted (Martin Fowler-derived tokens-as-data superiority claim, 0-3).
- Round 2 (gap-filling): 23 sources, 111 claims extracted, 25 verified → 24 confirmed, 1
  refuted (industry-wide custom-element non-adoption, 1-2).
- Targeted follow-up: Storybook shadow-DOM practice, Ladle/Histoire health, React 19
  sizing, preact/compat status (npm registry + GitHub + vendor docs, cited inline).
- Known limits: visual-tool shadow-DOM fidelity is unverified for all vendors (spike
  recommended); WP Rocket + Autoptimize conflict evidence is 2021-era (mechanism class
  persists, 2-1 vote); pricing figures are 2026-06-10 snapshots.
