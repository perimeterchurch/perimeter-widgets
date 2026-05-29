import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Combobox, ComboboxInput } from '../src/combobox';

describe('Combobox', () => {
  it('renders an input within the combobox root', () => {
    render(
      <Combobox items={['Apple', 'Banana']}>
        <ComboboxInput placeholder="Pick a fruit" />
      </Combobox>,
    );
    expect(screen.getByPlaceholderText('Pick a fruit')).toBeInTheDocument();
  });
});
