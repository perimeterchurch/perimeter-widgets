'use client';

import { useState, useCallback } from 'react';
import type { WidgetDefinition } from '@/lib/widgets-registry';
import { ConfigEditor } from './config-editor';
import { EmbedSnippet } from './embed-snippet';
import { WidgetMount } from './widget-mount';
import { WidgetToolbar } from './widget-toolbar';

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
    const [lastMountedAt, setLastMountedAt] = useState(() => Date.now());

    const bumpMount = useCallback(() => {
        setMountKey((k) => k + 1);
        setLastMountedAt(Date.now());
    }, []);

    const handleChange = useCallback(
        (newValues: Record<string, string | number | boolean>) => {
            setConfig(newValues);
            bumpMount();
        },
        [bumpMount],
    );

    const handleReset = useCallback(() => {
        setConfig(getDefaults(widget));
        bumpMount();
    }, [widget, bumpMount]);

    return (
        <div className='flex flex-col gap-6'>
            <WidgetToolbar onReload={bumpMount} lastMountedAt={lastMountedAt} />
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
