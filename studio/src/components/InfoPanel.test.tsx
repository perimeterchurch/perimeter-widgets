// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, within, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { z } from 'zod';
import type { WidgetDefinition } from '@perimeter/widget-runtime';
import { InfoPanel } from './InfoPanel';

// The studio suite has no global RTL auto-cleanup; unmount between tests.
afterEach(cleanup);

const definition: WidgetDefinition = {
  name: 'sermons',
  auth: 'none',
  version: '1.0.0',
  // A camelCase numeric field with a default, plus a flag — exercises the
  // camelCase→kebab conversion and the default-as-attr-value rendering.
  schema: z.object({
    perPage: z.coerce.number().default(12),
    showImages: z.coerce.boolean().default(true),
  }),
  render: () => {},
} as unknown as WidgetDefinition;

describe('InfoPanel data-* copy affordance', () => {
  let writeText: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
  });

  it('copies the kebab-cased data-* attribute with its default value', async () => {
    const { container } = render(<InfoPanel definition={definition} />);
    const scope = within(container);

    // Each schema row offers a "copy data-*" control labelled by the attr it writes.
    const copyPerPage = scope.getByRole('button', { name: /copy data-per-page/i });
    fireEvent.click(copyPerPage);

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('data-per-page="12"');
    });
  });

  it('converts a boolean field key to kebab and copies its default', async () => {
    const { container } = render(<InfoPanel definition={definition} />);
    const scope = within(container);

    fireEvent.click(scope.getByRole('button', { name: /copy data-show-images/i }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('data-show-images="true"');
    });
  });
});
