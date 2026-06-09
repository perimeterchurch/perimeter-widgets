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

  it('caps the popup width so it cannot clip on narrow widths', () => {
    const { container } = render(
      <IconSelect value="grid" onChange={() => {}} options={options} label="View:" icon={null} />,
    );
    fireEvent.click(screen.getAllByRole('button')[0]!);
    const popup = container.querySelector('.max-w-\\[calc\\(100vw-1rem\\)\\]');
    expect(popup).not.toBeNull();
    expect(popup).toHaveClass('right-0');
  });

  it('truncates the trigger label so it cannot overflow the row', () => {
    const { container } = render(
      <IconSelect value="grid" onChange={() => {}} options={options} label="View:" icon={null} />,
    );
    expect(container.querySelector('.truncate')).not.toBeNull();
  });
});

describe('IconSelect compact', () => {
  const options = [{ value: 'grid', label: 'Grid', icon: null }];
  it('shows the label prefix by default', () => {
    render(
      <IconSelect label="View:" icon={null} value="grid" options={options} onChange={() => {}} />,
    );
    expect(screen.getByText(/View:/)).toBeTruthy();
  });
  it('hides the label prefix when compact (value still shows)', () => {
    render(
      <IconSelect
        compact
        label="View:"
        icon={null}
        value="grid"
        options={options}
        onChange={() => {}}
      />,
    );
    expect(screen.queryByText(/View:/)).toBeNull();
    expect(screen.getByText('Grid')).toBeTruthy();
  });
});
