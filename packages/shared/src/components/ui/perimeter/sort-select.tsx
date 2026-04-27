import { useCallback, useRef, useState, type ReactNode } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Check } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useClickOutside } from '../../../lib/use-click-outside';

export interface SortFieldOption {
    value: string;
    label: string;
    icon: ReactNode;
}

interface SortSelectProps {
    sortField: string;
    sortDirection: 'asc' | 'desc';
    onSortFieldChange: (field: string) => void;
    onSortDirectionChange: (direction: 'asc' | 'desc') => void;
    fields: SortFieldOption[];
    className?: string;
}

export function SortSelect({
    sortField,
    sortDirection,
    onSortFieldChange,
    onSortDirectionChange,
    fields,
    className,
}: SortSelectProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useClickOutside(
        ref,
        useCallback(() => setOpen(false), []),
        open,
    );

    const activeField = fields.find((f) => f.value === sortField);
    const DirectionIcon = sortDirection === 'asc' ? ArrowUp : ArrowDown;

    return (
        <div ref={ref} className={cn('relative', className)}>
            <button
                type='button'
                onClick={() => setOpen(!open)}
                className={cn(
                    'inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-sm',
                    'border-input bg-transparent text-muted-foreground',
                    'transition-colors hover:bg-muted/30',
                )}
            >
                <ArrowUpDown className='h-3.5 w-3.5 shrink-0' />
                <span>
                    Sort by:{' '}
                    <span className='font-medium text-foreground'>
                        {activeField?.label ?? sortField}
                    </span>
                </span>
                <DirectionIcon className='h-3 w-3 shrink-0' />
            </button>

            {open && (
                <div className='absolute right-0 z-50 mt-1 w-48 rounded-lg bg-popover shadow-md ring-1 ring-foreground/10'>
                    {/* Sort field options */}
                    <div className='px-3 pb-1 pt-2.5'>
                        <span className='text-[10px] font-semibold uppercase tracking-wider text-muted-foreground'>
                            Sort by
                        </span>
                    </div>
                    <div className='py-1'>
                        {fields.map((field) => (
                            <button
                                key={field.value}
                                type='button'
                                onClick={() => onSortFieldChange(field.value)}
                                className='flex w-full items-center gap-2.5 px-3 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground'
                            >
                                <span className='flex shrink-0 items-center text-muted-foreground'>
                                    {field.icon}
                                </span>
                                <span
                                    className={cn(
                                        'flex-1 text-left',
                                        sortField === field.value
                                            && 'font-medium',
                                    )}
                                >
                                    {field.label}
                                </span>
                                {sortField === field.value && (
                                    <Check className='h-3.5 w-3.5 shrink-0 text-primary' />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Divider */}
                    <div className='mx-3 h-px bg-border' />

                    {/* Direction options */}
                    <div className='px-3 pb-1 pt-2.5'>
                        <span className='text-[10px] font-semibold uppercase tracking-wider text-muted-foreground'>
                            Direction
                        </span>
                    </div>
                    <div className='pb-1.5 pt-1'>
                        <button
                            type='button'
                            onClick={() => {
                                onSortDirectionChange('asc');
                                setOpen(false);
                            }}
                            className='flex w-full items-center gap-2.5 px-3 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground'
                        >
                            <ArrowUp className='h-3.5 w-3.5 shrink-0 text-muted-foreground' />
                            <span
                                className={cn(
                                    'flex-1 text-left',
                                    sortDirection === 'asc' && 'font-medium',
                                )}
                            >
                                Ascending
                            </span>
                            {sortDirection === 'asc' && (
                                <Check className='h-3.5 w-3.5 shrink-0 text-primary' />
                            )}
                        </button>
                        <button
                            type='button'
                            onClick={() => {
                                onSortDirectionChange('desc');
                                setOpen(false);
                            }}
                            className='flex w-full items-center gap-2.5 px-3 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground'
                        >
                            <ArrowDown className='h-3.5 w-3.5 shrink-0 text-muted-foreground' />
                            <span
                                className={cn(
                                    'flex-1 text-left',
                                    sortDirection === 'desc' && 'font-medium',
                                )}
                            >
                                Descending
                            </span>
                            {sortDirection === 'desc' && (
                                <Check className='h-3.5 w-3.5 shrink-0 text-primary' />
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
