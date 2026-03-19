import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../utils/cn';

export interface PaginationProps {
    page: number;
    totalPages: number;
    onChange: (page: number) => void;
    maxButtons?: number;
    className?: string;
}

function getPageNumbers(
    current: number,
    total: number,
    max: number,
): (number | 'ellipsis')[] {
    if (total <= max) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: (number | 'ellipsis')[] = [];
    const sideCount = Math.floor((max - 3) / 2);
    pages.push(1);
    const leftBound = Math.max(2, current - sideCount);
    const rightBound = Math.min(total - 1, current + sideCount);
    if (leftBound > 2) pages.push('ellipsis');
    for (let i = leftBound; i <= rightBound; i++) pages.push(i);
    if (rightBound < total - 1) pages.push('ellipsis');
    if (total > 1) pages.push(total);
    return pages;
}

const buttonBase = cn(
    'flex items-center justify-center rounded-md text-sm font-medium transition-colors',
    'h-8 min-w-8 px-2',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/50',
);

export function Pagination({
    page,
    totalPages,
    onChange,
    maxButtons = 7,
    className,
}: PaginationProps) {
    const pages = useMemo(
        () => getPageNumbers(page, totalPages, maxButtons),
        [page, totalPages, maxButtons],
    );
    if (totalPages <= 1) return null;
    return (
        <nav
            aria-label='Pagination'
            className={cn('flex items-center justify-center gap-1', className)}
        >
            <button
                type='button'
                onClick={() => onChange(page - 1)}
                disabled={page <= 1}
                aria-label='Previous page'
                className={cn(
                    buttonBase,
                    'border border-stone-200 dark:border-stone-700',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'hover:bg-stone-100 dark:hover:bg-stone-800',
                )}
            >
                <ChevronLeft className='h-4 w-4' />
            </button>
            {pages.map((p, i) =>
                p === 'ellipsis' ?
                    <span
                        key={`ellipsis-${i}`}
                        className='px-1 text-sm text-stone-400'
                    >
                        ...
                    </span>
                :   <button
                        key={p}
                        type='button'
                        onClick={() => onChange(p)}
                        aria-label={`Page ${p}`}
                        aria-current={p === page ? 'page' : undefined}
                        className={cn(
                            buttonBase,
                            p === page ?
                                'bg-[var(--color-primary)] text-white'
                            :   'border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800',
                        )}
                    >
                        {p}
                    </button>,
            )}
            <button
                type='button'
                onClick={() => onChange(page + 1)}
                disabled={page >= totalPages}
                aria-label='Next page'
                className={cn(
                    buttonBase,
                    'border border-stone-200 dark:border-stone-700',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'hover:bg-stone-100 dark:hover:bg-stone-800',
                )}
            >
                <ChevronRight className='h-4 w-4' />
            </button>
        </nav>
    );
}
