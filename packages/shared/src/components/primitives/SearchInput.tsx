import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '../utils/cn';

export interface SearchInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    debounce?: number;
    className?: string;
}

export function SearchInput({
    value,
    onChange,
    placeholder = 'Search...',
    debounce = 300,
    className,
}: SearchInputProps) {
    const [localValue, setLocalValue] = useState(value);
    const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    const debouncedOnChange = useCallback(
        (val: string) => {
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => onChange(val), debounce);
        },
        [onChange, debounce],
    );

    useEffect(
        () => () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        },
        [],
    );

    const handleChange = (val: string) => {
        setLocalValue(val);
        debouncedOnChange(val);
    };

    const handleClear = () => {
        setLocalValue('');
        if (timerRef.current) clearTimeout(timerRef.current);
        onChange('');
    };

    return (
        <div className={cn('relative flex items-center', className)}>
            <div className='pointer-events-none absolute left-3 flex items-center justify-center'>
                <Search className='h-4 w-4 text-[var(--color-text-muted)]' />
            </div>
            <input
                type='text'
                value={localValue}
                onChange={(e) => handleChange(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                        handleClear();
                        e.currentTarget.blur();
                    }
                }}
                placeholder={placeholder}
                className={cn(
                    'h-10 w-full rounded-lg border pl-9 pr-9 text-sm',
                    'bg-[var(--color-background)]',
                    'border-[var(--color-input)]',
                    'text-[var(--color-foreground)]',
                    'placeholder:text-[var(--color-text-muted)]',
                    'transition-colors duration-200',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/50 focus-visible:ring-offset-2',
                    'focus-visible:border-[var(--color-primary)]',
                )}
                aria-label={placeholder}
            />
            {localValue && (
                <button
                    type='button'
                    onClick={handleClear}
                    className='absolute right-3 flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-foreground)]'
                    aria-label='Clear search'
                >
                    <X className='h-4 w-4' />
                </button>
            )}
        </div>
    );
}
