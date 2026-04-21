'use client';

import { useState, useCallback } from 'react';
import type { WidgetDefinition } from '@/lib/widgets-registry';
import { ConfigEditor } from './config-editor';
import { EmbedSnippet } from './embed-snippet';
import { WidgetMount } from './widget-mount';

interface WidgetPreviewClientProps {
    widget: WidgetDefinition;
}

function getDefaults(widget: WidgetDefinition) {
    const defaults: Record<string, string | number | boolean> = {};
    for (const field of widget.configFields) {
        defaults[field.key] = field.defaultValue;
    }
    return defaults;
}

export function WidgetPreviewClient({ widget }: WidgetPreviewClientProps) {
    const [config, setConfig] = useState(() => getDefaults(widget));
    const [mountKey, setMountKey] = useState(0);

    const handleChange = useCallback(
        (newValues: Record<string, string | number | boolean>) => {
            setConfig(newValues);
            setMountKey((k) => k + 1);
        },
        [],
    );

    const handleReset = useCallback(() => {
        setConfig(getDefaults(widget));
        setMountKey((k) => k + 1);
    }, [widget]);

    return (
        <div className='flex flex-col gap-6'>
            <WidgetMount widget={widget} config={config} mountKey={mountKey} />
            <ConfigEditor
                fields={widget.configFields}
                values={config}
                onChange={handleChange}
                onReset={handleReset}
            />
            <EmbedSnippet widget={widget} config={config} />
        </div>
    );
}
