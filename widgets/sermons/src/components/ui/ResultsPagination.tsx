import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from '@perimeter/ui/pagination';
import { getPageRange } from '../../lib/pagination';

interface ResultsPaginationProps {
  /**
   * Current page. The two views source this differently (sermons uses the
   * server pagination envelope's `page`; series uses the filters' `page`), so
   * the caller passes whichever is authoritative for that view.
   */
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Accessible label, e.g. "Sermon results pagination". */
  label: string;
}

/**
 * Shared pager built on the @perimeter/ui Pagination primitives. The active
 * page is driven entirely by the `page` prop (page-source as a prop) so each
 * view keeps ownership of where the current page lives. Renders nothing when
 * there is a single page — callers no longer need to guard on totalPages.
 */
export function ResultsPagination({
  page,
  totalPages,
  onPageChange,
  label,
}: ResultsPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <Pagination aria-label={label}>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            onClick={() => onPageChange(Math.max(1, page - 1))}
            aria-disabled={page <= 1}
            className={page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
          />
        </PaginationItem>
        {getPageRange(page, totalPages).map((item, idx) =>
          item === 'ellipsis' ? (
            <PaginationItem key={`e-${idx}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={item}>
              <PaginationLink
                isActive={item === page}
                onClick={() => onPageChange(item)}
                className="cursor-pointer"
              >
                {item}
              </PaginationLink>
            </PaginationItem>
          ),
        )}
        <PaginationItem>
          <PaginationNext
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            aria-disabled={page >= totalPages}
            className={page >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
