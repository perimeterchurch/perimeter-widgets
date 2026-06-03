import type { ReactNode, ComponentPropsWithoutRef } from 'react';
import type { MDXComponents } from 'mdx/types.js';
import { MDXProvider } from '@mdx-js/react';
import { Badge } from '@perimeter/ui/badge';
import { Button } from '@perimeter/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@perimeter/ui/card';
import { ComponentStage } from '../components/ComponentStage';

/**
 * The MDX rendering layer for the design-system site.
 *
 * `mdxComponents` styles the base markdown elements with the token palette so a
 * single `.mdx` file reads as plain markdown for Claude AND renders as a polished
 * doc page. It also exposes the live-doc building blocks authors use inline:
 * `ComponentStage` (re-export — mounts content through the real shadow-DOM widget
 * styling path) and `<Example>` (a labeled stage wrapper for component galleries).
 *
 * Chrome (light DOM) resolves `var(--color-*)` because the Task-2 `:root` token
 * layer is installed — that is why `text-fg`, `border-border`, etc. work here.
 */

/**
 * A labeled live example: renders its children inside a ComponentStage (real
 * shadow-DOM styling, parity-correct) under a small caption. The canonical block
 * a component `.mdx` uses to show a working component next to its prose.
 */
export function Example({ label, children }: { label?: ReactNode; children: ReactNode }) {
  return (
    <figure className="my-6">
      <Card className="overflow-hidden">
        <CardContent className="flex min-h-[8rem] items-center justify-center gap-4 bg-muted/40 p-8">
          <ComponentStage>{children}</ComponentStage>
        </CardContent>
      </Card>
      {label ? (
        <figcaption className="mt-2 text-xs font-medium uppercase tracking-wider text-muted-fg">
          {label}
        </figcaption>
      ) : null}
    </figure>
  );
}

function H1(props: ComponentPropsWithoutRef<'h1'>) {
  return (
    <h1
      {...props}
      className="mb-4 mt-2 scroll-mt-20 text-3xl font-semibold tracking-tight text-fg"
    />
  );
}

function H2(props: ComponentPropsWithoutRef<'h2'>) {
  return (
    <h2
      {...props}
      className="mb-3 mt-10 scroll-mt-20 border-b border-border pb-2 text-xl font-semibold tracking-tight text-fg"
    />
  );
}

function H3(props: ComponentPropsWithoutRef<'h3'>) {
  return <h3 {...props} className="mb-2 mt-8 scroll-mt-20 text-base font-semibold text-fg" />;
}

function P(props: ComponentPropsWithoutRef<'p'>) {
  return <p {...props} className="my-4 leading-7 text-fg/90" />;
}

function Ul(props: ComponentPropsWithoutRef<'ul'>) {
  return (
    <ul {...props} className="my-4 ml-6 list-disc space-y-2 text-fg/90 marker:text-muted-fg" />
  );
}

function Ol(props: ComponentPropsWithoutRef<'ol'>) {
  return (
    <ol {...props} className="my-4 ml-6 list-decimal space-y-2 text-fg/90 marker:text-muted-fg" />
  );
}

function Li(props: ComponentPropsWithoutRef<'li'>) {
  return <li {...props} className="leading-7" />;
}

function A(props: ComponentPropsWithoutRef<'a'>) {
  return (
    <a
      {...props}
      className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
    />
  );
}

function InlineCode(props: ComponentPropsWithoutRef<'code'>) {
  return (
    <code
      {...props}
      className="rounded-sm border border-border bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-fg"
    />
  );
}

function Pre(props: ComponentPropsWithoutRef<'pre'>) {
  // Code blocks: a single bordered surface. The inner <code> resets the inline
  // chip styling so a fenced block reads as one panel, not chips-in-a-panel.
  return (
    <pre
      {...props}
      className="my-5 overflow-x-auto rounded-md border border-border bg-muted p-4 font-mono text-sm leading-6 text-fg [&_code]:border-0 [&_code]:bg-transparent [&_code]:p-0"
    />
  );
}

function Blockquote(props: ComponentPropsWithoutRef<'blockquote'>) {
  return (
    <blockquote {...props} className="my-5 border-l-2 border-primary pl-4 italic text-muted-fg" />
  );
}

function Hr(props: ComponentPropsWithoutRef<'hr'>) {
  return <hr {...props} className="my-8 border-border" />;
}

function Table(props: ComponentPropsWithoutRef<'table'>) {
  return (
    <div className="my-6 overflow-x-auto rounded-md border border-border">
      <table {...props} className="w-full border-collapse text-sm" />
    </div>
  );
}

function Th(props: ComponentPropsWithoutRef<'th'>) {
  return (
    <th
      {...props}
      className="border-b border-border bg-muted px-4 py-2.5 text-left font-semibold text-fg"
    />
  );
}

function Td(props: ComponentPropsWithoutRef<'td'>) {
  return <td {...props} className="border-b border-border px-4 py-2.5 align-top text-fg/90" />;
}

/**
 * The component map handed to MDXProvider. Base markdown elements are styled with
 * the token palette; the live-doc components let `.mdx` mount real examples.
 */
export const mdxComponents: MDXComponents = {
  h1: H1,
  h2: H2,
  h3: H3,
  p: P,
  ul: Ul,
  ol: Ol,
  li: Li,
  a: A,
  code: InlineCode,
  pre: Pre,
  blockquote: Blockquote,
  hr: Hr,
  table: Table,
  th: Th,
  td: Td,
  // Live-doc building blocks authored directly in .mdx.
  ComponentStage,
  Example,
  // @perimeter/ui components provided to MDX scope so component docs can render
  // live examples WITHOUT per-file imports. Docs live at repo root (docs/*.mdx),
  // outside any package, where bare workspace specifiers don't resolve — and
  // import-free docs read more cleanly as plain markdown for Claude. Extend this
  // map as docs land for more components (Phase 5).
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
};

/**
 * Wraps MDX-rendered children so every base element + live-doc component resolves
 * to the studio's styled mapping. Used by the guide/component MDX pages.
 */
export function StudioMDXProvider({ children }: { children: ReactNode }) {
  return <MDXProvider components={mdxComponents}>{children}</MDXProvider>;
}
