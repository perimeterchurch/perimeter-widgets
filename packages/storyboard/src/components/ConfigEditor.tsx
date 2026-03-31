import { useState } from 'react';
import type { ConfigField } from '@/registry';

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
            <div className='px-4 py-3 border-t border-stone-100 dark:border-stone-700 bg-stone-50 dark:bg-stone-900/50 rounded-b-lg'>
                <p className='text-xs text-stone-400'>
                    Data attributes:{' '}
                    <code className='text-stone-500 dark:text-stone-300'>
                        {fields
                            .map((f) => {
                                const val = draft[f.key] ?? f.defaultValue;
                                if (val === '' || val === false) return null;
                                const attr = f.key.replace(
                                    /[A-Z]/g,
                                    (m) => `-${m.toLowerCase()}`,
                                );
                                return `data-${attr}="${val}"`;
                            })
                            .filter(Boolean)
                            .join(' ')}
                    </code>
                </p>
            </div>
        </div>
    );
}

const inputClasses =
    'w-full rounded-md border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 px-3 py-1.5 text-sm text-stone-900 dark:text-stone-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none';

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
