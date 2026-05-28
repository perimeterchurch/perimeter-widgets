import * as React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReleasePanel } from '@/app/admin/releases/release-panel';

const builds = [
  { version: '1.1.0', sha: 'bbb', sizeGz: 2048, builtAt: '2026-05-27T00:00:00.000Z', blobPath: 'sermons/1.1.0/index.js' },
  { version: '1.0.0', sha: 'aaa', sizeGz: 1024, builtAt: '2026-05-26T00:00:00.000Z', blobPath: 'sermons/1.0.0/index.js' },
];

describe('ReleasePanel', () => {
  it('badges the live build and promotes another on click', async () => {
    const onPromote = vi.fn().mockResolvedValue(undefined);
    render(<ReleasePanel name="sermons" builds={builds} latest="1.0.0" onPromote={onPromote} onRollback={vi.fn()} />);
    expect(screen.getByText('1.0.0').closest('li')).toHaveTextContent('LATEST');
    await userEvent.click(screen.getByRole('button', { name: /promote 1\.1\.0/i }));
    expect(onPromote).toHaveBeenCalledWith('sermons', '1.1.0');
  });
});
