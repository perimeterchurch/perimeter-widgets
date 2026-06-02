import { test } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const PROPS = ['font-family', 'font-size', 'color', 'line-height'] as const;

test('host-style inheritance through the shadow root', async ({ page }) => {
  await page.goto('http://localhost:4173/example.html');
  await page.waitForFunction(
    () =>
      !!document.querySelector('[data-perimeter-widget="example"]')?.shadowRoot?.firstElementChild,
  );

  const read = () =>
    page.evaluate(
      (props) => {
        const shadow = document.querySelector('[data-perimeter-widget="example"]')!.shadowRoot!;
        const el =
          shadow.querySelector('p, h1, h2, h3, span, div div') ?? shadow.firstElementChild!;
        const cs = getComputedStyle(el as Element);
        return Object.fromEntries(props.map((p) => [p, cs.getPropertyValue(p)]));
      },
      [...PROPS],
    );

  const before = await read();
  await page.addStyleTag({
    content:
      'body{font-family:cursive !important;font-size:24px !important;color:rgb(200,0,0) !important;line-height:2.5 !important}',
  });
  const after = await read();

  const rows = PROPS.map((p) => {
    const inherited = before[p] !== after[p];
    return `| \`${p}\` | \`${before[p]}\` | \`${after[p]}\` | ${inherited ? '**YES — pierces shadow**' : 'no'} |`;
  });
  writeFileSync(
    'reports/inheritance.md',
    [
      '# Host-style inheritance probe (H4)',
      '',
      '| property | default host | mutated host | inherited into widget? |',
      '| --- | --- | --- | --- |',
      ...rows,
      '',
      'Every YES row = a property the studio canvas must replicate (host-page sim) and/or the widget CSS must pin.',
    ].join('\n'),
  );
});
