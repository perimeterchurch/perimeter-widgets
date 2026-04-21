'use client';

import { useState, useEffect, useRef } from 'react';
import type { ConfigField } from '@/lib/widgets-registry';

interface ConfigEditorProps {
    fields: ConfigField[];
    values: Record<string, string | number | boolean>;
    onChange: (values: Record<string, string | number | boolean>) => void;
    onReset: () => void;
}

export function ConfigEditor({
    fields,
    values,
    onChange,
    onReset,
}: ConfigEditorProps) {
    const [draft, setDraft] = useState(values);
    const isDirty = JSON.stringify(draft) !== JSON.stringify(values);

    const updateField = (key: string, value: string | number | boolean) => {
        setDraft((prev) => ({ ...prev, [key]: value }));
    };

    const apply = () => {
        onChange(draft);
    };

    const reset = () => {
        onReset();
        const defaults: Record<string, string | number | boolean> = {};
        for (const field of fields) {
            defaults[field.key] = field.defaultValue;
        }
        setDraft(defaults);
    };

    return (
        <div className='border border-stone-200 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-800'>
            <div className='flex items-center justify-between px-4 py-3 border-b border-stone-200 dark:border-stone-700'>
                <h4 className='text-sm font-semibold text-stone-800 dark:text-stone-200'>
                    Configuration
                </h4>
                <div className='flex items-center gap-2'>
                    {isDirty && (
                        <button
                            onClick={apply}
                            className='text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded transition-colors'
                        >
                            Apply
                        </button>
                    )}
                    <button
                        onClick={reset}
                        className='text-xs text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors'
                    >
                        Reset
                    </button>
                </div>
            </div>
            <div className='p-4 grid grid-cols-1 sm:grid-cols-2 gap-4'>
                {fields.map((field) => (
                    <FieldInput
                        key={field.key}
                        field={field}
                        value={draft[field.key] ?? field.defaultValue}
                        onChange={(value) => updateField(field.key, value)}
                    />
                ))}
            </div>
        </div>
    );
}

const inputClasses =
    'w-full rounded-md border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 px-3 py-1.5 text-sm text-stone-900 dark:text-stone-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none';

interface ApiOption {
    id: number;
    name: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.perimeter.org';

function MultiSelectApiField({
    field,
    value,
    onChange,
}: {
    field: ConfigField;
    value: string;
    onChange: (value: string) => void;
}) {
    const [options, setOptions] = useState<ApiOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!field.apiPath) return;
        let cancelled = false;

        async function fetchAllPages() {
            const apiPath = field.apiPath!;
            const sep = apiPath.includes('?') ? '&' : '?';
            const allItems: Record<string, unknown>[] = [];
            let page = 1;

            while (true) {
                const url = `${API_BASE}${apiPath}${sep}perPage=50&page=${page}`;
                const res = await fetch(url);
                if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
                const json = (await res.json()) as { data: unknown };
                const data = json.data;

                if (Array.isArray(data)) {
                    allItems.push(...(data as Record<string, unknown>[]));
                    break;
                }

                const obj = data as Record<string, unknown>;
                const items = (obj.series ?? obj.sermons ?? []) as Record<
                    string,
                    unknown
                >[];
                const pagination = obj.pagination as
                    | { totalPages: number }
                    | undefined;
                allItems.push(...items);

                if (!pagination || page >= pagination.totalPages) break;
                page++;
            }

            if (!cancelled) {
                setOptions(
                    allItems.map((item) => ({
                        id: item.id as number,
                        name: (item.displayTitle
                            ?? item.title
                            ?? item.name) as string,
                    })),
                );
            }
        }

        fetchAllPages()
            .catch((err) =>
                console.warn(
                    `[ConfigEditor] Failed to fetch ${field.apiPath}:`,
                    err,
                ),
            )
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [field.apiPath]);

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (
                containerRef.current
                && !containerRef.current.contains(e.target as Node)
            ) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    useEffect(() => {
        if (open) searchRef.current?.focus();
    }, [open]);

    const selectedIds =
        value ?
            value
                .split(',')
                .map(Number)
                .filter((n) => !isNaN(n) && n > 0)
        :   [];

    const toggle = (id: number) => {
        const next =
            selectedIds.includes(id) ?
                selectedIds.filter((x) => x !== id)
            :   [...selectedIds, id];
        onChange(next.length > 0 ? next.join(',') : '');
    };

    const filtered =
        search ?
            options.filter(
                (o) =>
                    o.name.toLowerCase().includes(search.toLowerCase())
                    || String(o.id).includes(search),
            )
        :   options;

    const selectedNames = selectedIds
        .map((id) => options.find((o) => o.id === id)?.name)
        .filter(Boolean);

    return (
        <div ref={containerRef} className='relative'>
            <button
                type='button'
                onClick={() => {
                    setOpen(!open);
                    setSearch('');
                }}
                className={`${inputClasses} text-left flex items-center justify-between gap-2`}
            >
                <span
                    className={`truncate ${selectedIds.length === 0 ? 'text-stone-400' : ''}`}
                >
                    {loading ?
                        'Loading...'
                    : selectedIds.length === 0 ?
                        'None selected'
                    :   selectedNames.join(', ')}
                </span>
                <svg
                    className='h-4 w-4 shrink-0 text-stone-400'
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'
                >
                    <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d={open ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'}
                    />
                </svg>
            </button>
            {open && (
                <div className='absolute z-50 mt-1 w-full rounded-md border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-700 shadow-lg'>
                    <div className='p-1.5 border-b border-stone-100 dark:border-stone-600'>
                        <input
                            ref={searchRef}
                            type='text'
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder='Search...'
                            className='w-full rounded border-0 bg-stone-50 dark:bg-stone-600 px-2.5 py-1.5 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-indigo-500'
                        />
                    </div>
                    <div className='max-h-52 overflow-auto py-1'>
                        {filtered.length === 0 && (
                            <div className='px-3 py-2 text-xs text-stone-400'>
                                {search ? 'No matches' : 'No options available'}
                            </div>
                        )}
                        {filtered.map((opt) => {
                            const checked = selectedIds.includes(opt.id);
                            return (
                                <label
                                    key={opt.id}
                                    className={`flex items-center gap-2.5 px-3 py-1.5 text-sm cursor-pointer transition-colors ${
                                        checked ?
                                            'bg-indigo-50 dark:bg-indigo-950/30'
                                        :   'hover:bg-stone-50 dark:hover:bg-stone-600'
                                    }`}
                                >
                                    <input
                                        type='checkbox'
                                        checked={checked}
                                        onChange={() => toggle(opt.id)}
                                        className='rounded border-stone-300 dark:border-stone-500 text-indigo-600 focus:ring-indigo-500'
                                    />
                                    <span className='flex-1 text-stone-700 dark:text-stone-200 truncate'>
                                        {opt.name}
                                    </span>
                                    <span className='text-stone-400 dark:text-stone-500 text-xs font-mono tabular-nums'>
                                        {opt.id}
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                    {selectedIds.length > 0 && (
                        <div className='flex items-center justify-between border-t border-stone-100 dark:border-stone-600 px-3 py-1.5'>
                            <span className='text-xs text-stone-400'>
                                {selectedIds.length} selected
                            </span>
                            <button
                                type='button'
                                onClick={() => onChange('')}
                                className='text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700'
                            >
                                Clear all
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function FieldInput({
    field,
    value,
    onChange,
}: {
    field: ConfigField;
    value: string | number | boolean;
    onChange: (value: string | number | boolean) => void;
}) {
    const inputId = `config-${field.key}`;

    return (
        <div>
            <label
                htmlFor={inputId}
                className='block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1'
            >
                {field.label}
            </label>

            {field.type === 'select' && field.options ?
                <select
                    id={inputId}
                    value={String(value)}
                    onChange={(e) => onChange(e.target.value)}
                    className={inputClasses}
                >
                    {field.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            : field.type === 'boolean' ?
                <label className='inline-flex items-center gap-2 cursor-pointer'>
                    <input
                        id={inputId}
                        type='checkbox'
                        checked={Boolean(value)}
                        onChange={(e) => onChange(e.target.checked)}
                        className='rounded border-stone-300 dark:border-stone-600 text-indigo-600 focus:ring-indigo-500'
                    />
                    <span className='text-sm text-stone-600 dark:text-stone-300'>
                        {value ? 'Enabled' : 'Disabled'}
                    </span>
                </label>
            : field.type === 'number' ?
                <input
                    id={inputId}
                    type='number'
                    value={Number(value)}
                    onChange={(e) => onChange(Number(e.target.value))}
                    className={inputClasses}
                />
            : field.type === 'multiselect-api' ?
                <MultiSelectApiField
                    field={field}
                    value={String(value)}
                    onChange={onChange}
                />
            :   <input
                    id={inputId}
                    type='text'
                    value={String(value)}
                    onChange={(e) => onChange(e.target.value)}
                    className={inputClasses}
                />
            }

            {field.description && (
                <p className='text-xs text-stone-400 mt-1'>
                    {field.description}
                </p>
            )}
        </div>
    );
}
