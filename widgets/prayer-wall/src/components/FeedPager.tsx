import * as React from 'react';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@perimeter/ui/pagination';
import { pageWindow } from '../lib/format';

export interface FeedPagerProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/**
 * Page controls for the feed. Rendered above and below the cards, as the wall
 * has always done — a visitor who reaches the bottom of page 3 should not have
 * to scroll back up to reach page 4.
 */
export function FeedPager({ page, totalPages, onPageChange }: FeedPagerProps): React.JSX.Element {
  return (
    <Pagination className="my-4 justify-start">
      <PaginationContent className="flex-wrap gap-1">
        <PaginationItem>
          <PaginationPrevious
            text="Previous"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          />
        </PaginationItem>
        {pageWindow(page, totalPages).map((candidate) => (
          <PaginationItem key={candidate}>
            <PaginationLink
              isActive={candidate === page}
              aria-label={`Go to page ${candidate}`}
              onClick={() => onPageChange(candidate)}
            >
              {candidate}
            </PaginationLink>
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNext
            text="Next"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
