'use client';

import { useState } from 'react';
import type { WidgetDefinition } from '@/lib/widgets-registry';
import { configToAttrString } from '@/lib/data-attrs';

interface EmbedSnippetProps {
    widget: WidgetDefinition;
    config: Record<string, string | number | boolean>;
    /** CDN URL the consumer should paste (defaults to jsDelivr @latest) */
    scriptUrl?: string;
}

export function EmbedSnippet({
    widget,
    config,
    scriptUrl = `https://cdn.jsdelivr.net/gh/perimeterchurch/perimeter-widgets@latest/dist/${widget.id}/${widget.id}.js`,
}: EmbedSnippetProps) {
    const [copied, setCopied] = useState(false);
    const attrString = configToAttrString(config);
    const snippet = [
        `<div id="${widget.elementId}"${attrString ? ' ' + attrString : ''}></div>`,
        `<script src="${scriptUrl}" async></script>`,
    ].join('\n');

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(snippet);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy embed snippet', err);
        }
    };

    return (
        <div className='border border-stone-200 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-800'>
            <div className='flex items-center justify-between px-4 py-3 border-b border-stone-200 dark:border-stone-700'>
                <h4 className='text-sm font-semibold text-stone-800 dark:text-stone-200'>
                    Embed snippet
                </h4>
                <button
                    onClick={copy}
                    className='text-xs font-medium text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 px-3 py-1 rounded transition-colors'
                >
                    {copied ? 'Copied!' : 'Copy'}
                </button>
            </div>
            <pre className='p-4 text-xs font-mono text-stone-800 dark:text-stone-200 bg-stone-50 dark:bg-stone-900/50 rounded-b-lg overflow-x-auto'>
                <code>{snippet}</code>
            </pre>
        </div>
    );
}
