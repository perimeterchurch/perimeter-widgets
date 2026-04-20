# Troubleshooting

Common issues and how to resolve them.

## Dev server hangs on startup

Turbopack cannot trace 55 dynamic demo imports. The `pnpm dev` command already uses `--webpack` to avoid this. If you see a hang, make sure you're running `pnpm dev` (not `next dev` directly).

## Components look outdated

Run `pnpm registry:build` to regenerate the built registry JSON in `public/r/`. This must be run after any change to files in `registry/ui/perimeter/`.

## Theme not applying

Check that the `data-theme` attribute is set on the `<html>` element. For dark mode, ensure the `.dark` class is also present. Run `pnpm generate:themes` if you've modified theme JSON files.

## Demo not showing in showcase

Run `pnpm collect:demos` to regenerate the demo manifest and import map. Verify your demo file exports `meta`, `controls`, `Playground`, and `examples`.

## Build fails with type errors

Run `pnpm typecheck` to see all errors. Common causes: missing return types on async functions, incorrect import paths after moving files.
