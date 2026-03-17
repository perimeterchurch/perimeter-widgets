# Developer Rules & Conventions

> **Scope:** Git workflow, pnpm, commit messages, quality checks
> **Key files:** `CLAUDE.md`, `package.json`
> **Last verified:** 2026-03-17

---

## Package Manager

Always use **pnpm**. Never use npm or npx.

| Do | Don't |
| --- | --- |
| `pnpm install` | `npm install` |
| `pnpm add <pkg>` | `npm install <pkg>` |
| `pnpm dlx <tool>` | `npx <tool>` |

---

## Git Workflow

### Branch Naming

- `feat/short-description` — new features
- `fix/short-description` — bug fixes
- `refactor/short-description` — restructuring without behavior change
- `chore/short-description` — tooling, deps, config
- `docs/short-description` — documentation only

### Commit Messages

[Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`

### Rules

- **Always create a branch** — never commit directly to `dev` or `main`
- **Merge target is `dev` only** — never merge directly to `main`
- **Never push to origin** — pushing is a manual task performed by the developer
- **Run `pnpm quality` before merging** — ensures typecheck, lint, format, and tests all pass
- **Use `--body-file` for PR bodies** — `gh pr create --body` injects ANSI escape codes. Write the body with the Write tool, then pass via `--body-file`

---

## Quality Checks

Run before every merge:

```bash
pnpm quality    # typecheck + lint + format + test
```

Individual checks:

| Command | What it runs |
| --- | --- |
| `pnpm typecheck` | TypeScript (`tsc --noEmit`) across all packages |
| `pnpm lint` | ESLint across all packages |
| `pnpm format` | Prettier (write mode) |
| `pnpm test` | Vitest across all packages |

---

## Documentation Maintenance

When creating or modifying widgets, shared components, or architecture, update the relevant doc in `docs/`:

- New widget → add `docs/widgets/<name>.md`
- New shared component → update `docs/architecture/shared-package.md`
- Architecture changes → update `docs/architecture/overview.md`

---

## Related Docs

- [Developer Setup](developer-setup.md) — Environment, commands
- [Adding a Widget](adding-a-widget.md) — Widget creation workflow
