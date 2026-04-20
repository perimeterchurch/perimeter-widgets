# Adding a Component to the Registry

## Adding a New shadcn Component

If shadcn releases a new component you want to include:

```bash
pnpm dlx shadcn@latest add [component-name]
```

This installs it to `src/components/ui/`. Copy it to the registry source:

```bash
cp src/components/ui/[component-name].tsx registry/ui/perimeter/
```

Then regenerate the registry manifest:

```bash
pnpm tsx scripts/generate-registry.ts
pnpm registry:build
```

## Customizing a Component

Edit the source in `registry/ui/perimeter/[component-name].tsx`. Your customizations become the version consumers install.

After editing, rebuild:

```bash
pnpm registry:build
```

## Creating a Custom Component

1. Create your component in `registry/ui/perimeter/my-component.tsx`
2. Use existing registry components via `@registry/ui/perimeter/button` imports
3. Run `pnpm tsx scripts/generate-registry.ts` to add it to the manifest
4. Run `pnpm registry:build` to generate the JSON

## Verifying

Check the built output:

```bash
cat public/r/[component-name].json | head -20
```

The JSON should contain the component's source code embedded in the `files[].content` field.
