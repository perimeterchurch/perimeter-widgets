import { useState, useRef, useCallback } from 'react';
import {
    Combobox,
    ComboboxInput,
    ComboboxContent,
    ComboboxList,
    ComboboxItem,
    ComboboxEmpty,
    ComboboxSeparator,
} from '@perimeter-widgets/shared';

export interface FilterOption {
    value: number;
    label: string;
}

interface FilterComboboxProps {
    options: FilterOption[];
    selected: number[];
    onToggle: (id: number) => void;
    onClear: () => void;
    placeholder: string;
}

export function FilterCombobox({
    options,
    selected,
    onToggle,
    onClear,
    placeholder,
}: FilterComboboxProps) {
    const [query, setQuery] = useState('');
    const anchorRef = useRef<HTMLDivElement>(null);

    const filtered =
        query ?
            options.filter((o) =>
                o.label.toLowerCase().includes(query.toLowerCase()),
            )
        :   options;

    const label =
        selected.length === 0 ? placeholder
        : selected.length === 1 ?
            (options.find((o) => o.value === selected[0])?.label ?? placeholder)
        :   `${selected.length} selected`;

    const handleValueChange = useCallback(
        (values: string[]) => {
            const prevSet = new Set(selected.map(String));
            const nextSet = new Set(values);

            // Find added item
            for (const v of nextSet) {
                if (!prevSet.has(v)) {
                    onToggle(Number(v));
                    setQuery('');
                    return;
                }
            }
            // Find removed item
            for (const v of prevSet) {
                if (!nextSet.has(v)) {
                    onToggle(Number(v));
                    setQuery('');
                    return;
                }
            }
        },
        [selected, onToggle],
    );

    return (
        <div ref={anchorRef}>
            <Combobox
                value={selected.map(String)}
                onValueChange={handleValueChange}
                multiple
            >
                <ComboboxInput
                    placeholder={label}
                    value={query}
                    onChange={(e) => setQuery(e.currentTarget.value)}
                    className='w-auto min-w-[140px]'
                />
                <ComboboxContent anchor={anchorRef}>
                    <ComboboxList>
                        {selected.length > 0 && (
                            <>
                                <button
                                    type='button'
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        onClear();
                                    }}
                                    className='flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground'
                                >
                                    Show all
                                </button>
                                <ComboboxSeparator />
                            </>
                        )}
                        <ComboboxEmpty>
                            No {placeholder.toLowerCase()} match the current
                            filters
                        </ComboboxEmpty>
                        {filtered.map((opt) => (
                            <ComboboxItem
                                key={opt.value}
                                value={String(opt.value)}
                            >
                                {opt.label}
                            </ComboboxItem>
                        ))}
                    </ComboboxList>
                </ComboboxContent>
            </Combobox>
        </div>
    );
}
