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
});
