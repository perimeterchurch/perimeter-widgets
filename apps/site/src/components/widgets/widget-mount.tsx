'use client';

import { useEffect, useRef } from 'react';
import type { WidgetDefinition } from '@/lib/widgets-registry';
import { configToDataAttrs } from '@/lib/data-attrs';
import { useTheme } from '@/lib/theme-context';

interface WidgetMountProps {
    widget: WidgetDefinition;
    config: Record<string, string | number | boolean>;
    /** Bump to force a fresh mount (e.g., after config is applied) */
    mountKey: number;
}

/**
 * Mounts a widget by rendering its target <div> and injecting the IIFE bundle.
 * The widget's own script calls mountWidget() and attaches a shadow root to the div.
 *
 * The site's theme mode is propagated via `data-theme="dark"|"light"` on the
 * mount div — the widget's shared CSS uses `:host([data-theme='dark'])` to
 * switch tokens (class-based dark mode doesn't cross the shadow boundary).
 * Mode changes force a full re-mount so the widget initializes against the
 * new shadow-host attribute.
 */
export function WidgetMount({ widget, config, mountKey }: WidgetMountProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const { mode } = useTheme();

    useEffect(() => {
        if (!containerRef.current) return;

        // Inject the widget IIFE. The widget auto-mounts via its mountWidget() call.
        // Adding a cache-busting query so repeated mounts during dev pick up the
        // freshly rebuilt bundle instead of a stale one.
        const script = document.createElement('script');
        script.src = `/widget-bundles/${widget.id}.js?t=${mountKey}-${mode}`;
        script.async = true;
        document.body.appendChild(script);

        return () => {
            script.remove();
            // Clear any shadow root the widget attached so the next mount is clean.
            const host = document.getElementById(widget.elementId);
            if (host?.shadowRoot) host.shadowRoot.innerHTML = '';
        };
    }, [widget.id, widget.elementId, mountKey, mode]);

    const attrs = configToDataAttrs(config);

    return (
        <div
            ref={containerRef}
            className='rounded-lg border bg-background p-4 min-h-[400px]'
        >
            <div
                id={widget.elementId}
                key={`${mountKey}-${mode}`}
                {...attrs}
                data-theme={mode}
            />
        </div>
    );
}
