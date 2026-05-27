import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from '../src/input-group';

describe('InputGroup', () => {
  it('renders the input within a group', () => {
    render(
      <InputGroup>
        <InputGroupAddon>
          <InputGroupText>@</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput placeholder="username" />
      </InputGroup>,
    );
    expect(screen.getByPlaceholderText('username')).toBeInTheDocument();
    expect(screen.getByText('@')).toBeInTheDocument();
  });

  it('renders an InputGroupButton as a button', () => {
    render(
      <InputGroup>
        <InputGroupInput placeholder="search" />
        <InputGroupAddon align="inline-end">
          <InputGroupButton>Go</InputGroupButton>
        </InputGroupAddon>
      </InputGroup>,
    );
    expect(screen.getByRole('button', { name: 'Go' })).toBeInTheDocument();
  });
});
