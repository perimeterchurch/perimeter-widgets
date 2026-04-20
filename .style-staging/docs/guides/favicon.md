# Adding a Favicon

Instructions for adding favicon and app icons to the Perimeter Style showcase site.

## Files to Create

Place these files in `public/`:

| File                   | Format | Size    | Purpose                   |
| ---------------------- | ------ | ------- | ------------------------- |
| `favicon.ico`          | ICO    | 32x32   | Browser tab icon (legacy) |
| `icon.svg`             | SVG    | Any     | Modern browsers, scalable |
| `apple-touch-icon.png` | PNG    | 180x180 | iOS home screen           |

## Update Layout Metadata

In `src/app/layout.tsx`, add the `icons` field to the metadata export:

```typescript
export const metadata: Metadata = {
  // ...existing fields
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
};
```

## Generating Icons

If you have an SVG source:

1. Use [RealFaviconGenerator](https://realfavicongenerator.net/) to generate all sizes
2. Or use ImageMagick: `convert icon.svg -resize 32x32 favicon.ico`
3. For apple-touch-icon: `convert icon.svg -resize 180x180 apple-touch-icon.png`

## Verification

After adding the files, run `pnpm build` and check the generated HTML in `out/index.html` for the correct `<link>` tags.
