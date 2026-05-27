import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { IconSelect, type IconSelectOption } from '../src/icon-select';

const options: IconSelectOption[] = [
  { value: 'grid', label: 'Grid', icon: null },
  { value: 'list', label: 'List', icon: null },
];

describe('IconSelect', () => {
  it('renders the active option label', () => {
    render(
      <IconSelect value="grid" onChange={() => {}} options={options} label="View:" icon={null} />,
    );
    expect(screen.getByText('Grid')).toBeInTheDocument();
  });

  it('opens the menu when clicked', () => {
    render(
      <IconSelect value="grid" onChange={() => {}} options={options} label="View:" icon={null} />,
    );
    fireEvent.click(screen.getAllByRole('button')[0]!);
    expect(screen.getByText('List')).toBeInTheDocument();
  });
});
