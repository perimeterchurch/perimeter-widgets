import { useState, useRef } from 'react';
import {
    Combobox,
    ComboboxInput,
    ComboboxContent,
    ComboboxList,
    ComboboxItem,
    ComboboxEmpty,
} from '@perimeter-widgets/shared';

export interface FilterOption {
    value: number;
    label: string;
}

interface FilterComboboxProps {
    options: FilterOption[];
    selected: number[];
    onToggle: (id: number) => void;
    placeholder: string;
}

export function FilterCombobox({
    options,
    selected,
    onToggle,
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

    return (
        <div ref={anchorRef}>
            <Combobox
                value={selected.map(String)}
                onValueChange={(values: string[]) => {
                    // Find which value was toggled
                    const prev = new Set(selected.map(String));
                    const next = new Set(values);
                    for (const v of next) {
                        if (!prev.has(v)) {
                            onToggle(Number(v));
                            return;
                        }
                    }
                    for (const v of prev) {
                        if (!next.has(v)) {
                            onToggle(Number(v));
                            return;
                        }
                    }
                }}
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
                        <ComboboxEmpty>No results</ComboboxEmpty>
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
