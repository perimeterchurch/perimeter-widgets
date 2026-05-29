import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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
            <PaginationPrevious href="#prev" />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#1" isActive>
              1
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
          <PaginationItem>
            <PaginationNext href="#next" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    expect(screen.getByRole('navigation', { name: 'pagination' })).toBeInTheDocument();
  });

  it('renders an active link as an anchor with aria-current', () => {
    render(
      <PaginationLink href="#1" isActive>
        1
      </PaginationLink>,
    );
    const link = screen.getByRole('link', { name: '1' });
    expect(link.tagName).toBe('A');
    expect(link.getAttribute('aria-current')).toBe('page');
  });
});
