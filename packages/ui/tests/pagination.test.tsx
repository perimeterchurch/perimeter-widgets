import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '../src/pagination';

describe('Pagination', () => {
  it('renders a navigation landmark', () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious onClick={() => {}} />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink isActive onClick={() => {}}>
              1
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
          <PaginationItem>
            <PaginationNext onClick={() => {}} />
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    expect(screen.getByRole('navigation', { name: 'pagination' })).toBeInTheDocument();
  });

  it('renders the active page as a button with aria-current', () => {
    render(
      <PaginationLink isActive onClick={() => {}}>
        1
      </PaginationLink>,
    );
    // onClick-driven pagination is interactive, not navigational: it must be a
    // real <button> so it is tab-focusable and Enter/Space-activatable.
    const control = screen.getByRole('button', { name: '1' });
    expect(control.tagName).toBe('BUTTON');
    expect(control.getAttribute('type')).toBe('button');
    expect(control.getAttribute('aria-current')).toBe('page');
  });

  it('is a focusable button that fires onClick (keyboard activation verified in the visual harness)', () => {
    const onClick = vi.fn();
    render(<PaginationLink onClick={onClick}>2</PaginationLink>);
    const control = screen.getByRole('button', { name: '2' });
    // A native <button> is implicitly tab-focusable (no tabIndex/role plumbing
    // needed) and natively Enter/Space-activatable — the a11y win over <a> with
    // no href. Focus + native keyboard activation is asserted in the Playwright
    // harness (real browser); here we prove it's focusable and click-driven.
    control.focus();
    expect(control).toHaveFocus();
    fireEvent.click(control);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
