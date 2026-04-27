import { useCallback, useRef, useState, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useClickOutside } from '../../../lib/use-click-outside';

export interface IconSelectOption {
    value: string;
    label: string;
    icon: ReactNode;
}

interface IconSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: IconSelectOption[];
    label: string;
    icon: ReactNode;
    className?: string;
}

export function IconSelect({
    value,
    onChange,
    options,
    label,
    icon,
    className,
}: IconSelectProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useClickOutside(
        ref,
        useCallback(() => setOpen(false), []),
        open,
    );

    const activeOption = options.find((o) => o.value === value);

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
                {icon}
                <span>
                    {label}{' '}
                    <span className='font-medium text-foreground'>
                        {activeOption?.label ?? value}
                    </span>
                </span>
            </button>

            {open && (
                <div className='absolute right-0 z-50 mt-1 w-44 rounded-lg bg-popover shadow-md ring-1 ring-foreground/10'>
                    <div className='py-1'>
                        {options.map((opt) => (
                            <button
                                key={opt.value}
                                type='button'
                                onClick={() => {
                                    onChange(opt.value);
                                    setOpen(false);
                                }}
                                className='flex w-full items-center gap-2.5 px-3 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground'
                            >
                                <span className='flex shrink-0 items-center text-muted-foreground'>
                                    {opt.icon}
                                </span>
                                <span
                                    className={cn(
                                        'flex-1 text-left',
                                        value === opt.value && 'font-medium',
                                    )}
                                >
                                    {opt.label}
                                </span>
                                {value === opt.value && (
                                    <Check className='h-3.5 w-3.5 shrink-0 text-primary' />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
