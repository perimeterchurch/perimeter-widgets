import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MultiCombobox } from '../src/multi-combobox';

const options = [
  { value: 'a', label: 'Apple' },
  { value: 'b', label: 'Banana' },
];

describe('MultiCombobox', () => {
  it('renders a toggle button and an input', () => {
    render(<MultiCombobox options={options} placeholder="Pick fruit" />);
    expect(screen.getByRole('button', { name: 'toggle menu' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Pick fruit')).toBeInTheDocument();
  });

  it('shows a clear button when a value is selected', () => {
    render(<MultiCombobox multiple options={options} value={['a']} />);
    expect(screen.getByRole('button', { name: 'Clear selection' })).toBeInTheDocument();
  });

  it('renders group headers as non-interactive presentation rows, not options', () => {
    const grouped = [
      { value: '__group_ot', label: 'Old Testament', disabled: true, isGroupHeader: true },
      { value: 'gen', label: 'Genesis' },
    ];
    render(<MultiCombobox multiple options={grouped} isOpen placeholder="Books" />);
    // The header is shown but is a presentation row (not selectable) — so it
    // doesn't appear as an option/button and downshift skips it.
    const header = screen.getByText('Old Testament');
    expect(header.getAttribute('role')).toBe('presentation');
    expect(header.className).not.toContain('line-through');
    // The real option below it still renders.
    expect(screen.getByText('Genesis')).toBeInTheDocument();
  });

  it('skips a group header that sets isGroupHeader without disabled (contract self-enforced)', () => {
    // The documented contract is that `isGroupHeader` alone makes the row
    // non-interactive; callers should NOT need to also set `disabled`. Downshift's
    // selectable items get role="option"; a presentation header must not.
    const grouped = [
      { value: '__group_ot', label: 'Old Testament', isGroupHeader: true },
      { value: 'gen', label: 'Genesis' },
    ];
    render(<MultiCombobox multiple options={grouped} isOpen placeholder="Books" />);
    const header = screen.getByText('Old Testament');
    expect(header.getAttribute('role')).toBe('presentation');
    // Only the real, selectable option is exposed as an option row.
    const optionRows = screen.getAllByRole('option');
    expect(optionRows).toHaveLength(1);
    expect(optionRows[0]).toHaveTextContent('Genesis');
  });
});
