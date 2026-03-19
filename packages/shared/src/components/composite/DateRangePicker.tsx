import { Calendar } from 'lucide-react';
import { cn } from '../utils/cn';

export interface DateRangePickerProps {
    from: string;
    to: string;
    onFromChange: (value: string) => void;
    onToChange: (value: string) => void;
    className?: string;
}

const inputClasses = cn(
    'h-9 rounded-lg border px-3 text-sm',
    'bg-white dark:bg-stone-900',
    'border-stone-300 dark:border-stone-600',
    'text-stone-900 dark:text-stone-100',
    'transition-colors duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/50',
    'focus-visible:border-[var(--color-primary)]',
);

export function DateRangePicker({
    from,
    to,
    onFromChange,
    onToChange,
    className,
}: DateRangePickerProps) {
    return (
        <div className={cn('flex items-center gap-2', className)}>
            <div className='relative'>
                <Calendar className='pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400' />
                <input
                    type='date'
                    value={from}
                    onChange={(e) => onFromChange(e.target.value)}
                    max={to || undefined}
                    className={cn(inputClasses, 'pl-8 w-[150px]')}
                    aria-label='From date'
                />
            </div>
            <span className='text-sm text-stone-400'>to</span>
            <div className='relative'>
                <Calendar className='pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400' />
                <input
                    type='date'
                    value={to}
                    onChange={(e) => onToChange(e.target.value)}
                    min={from || undefined}
                    className={cn(inputClasses, 'pl-8 w-[150px]')}
                    aria-label='To date'
                />
            </div>
        </div>
    );
}
