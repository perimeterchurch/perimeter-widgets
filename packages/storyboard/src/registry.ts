/**
 * Widget registry — defines all widgets available in the storyboard
 * with their configurable fields, defaults, and metadata.
 */
import type { ComponentType } from 'react';

export interface ConfigField {
    /** Data attribute name in camelCase (e.g., 'perPage' → data-per-page) */
    key: string;
    /** Human-readable label */
    label: string;
    /** Field type for the config editor */
    type: 'text' | 'number' | 'boolean' | 'select';
    /** Default value */
    defaultValue: string | number | boolean;
    /** Options for select fields */
    options?: { label: string; value: string }[];
    /** Help text shown below the field */
    description?: string;
}

export interface WidgetModule {
    component: ComponentType;
    styles: string;
}

export interface WidgetDefinition {
    /** Unique widget ID */
    id: string;
    /** Display name */
    name: string;
    /** Short description */
    description: string;
    /** Target element ID for mounting */
    elementId: string;
    /** Widget status */
    status: 'ready' | 'skeleton' | 'planned';
    /** Async loader — must use static import paths for Vite to resolve */
    load: () => Promise<WidgetModule>;
    /** Configurable data-* attributes */
    configFields: ConfigField[];
}

export const widgetRegistry: WidgetDefinition[] = [
    {
        id: 'sermons',
        name: 'Sermons',
        description:
            'Search and browse sermons and sermon series with watch/listen view',
        elementId: 'perimeter-sermons',
        status: 'ready',
        load: async () => {
            const [app, styles] = await Promise.all([
                import('@perimeter-widgets/widget-sermons/app'),
                import('@perimeter-widgets/widget-sermons/styles?inline'),
            ]);
            return {
                component: app.SermonsApp,
                styles: styles.default,
            };
        },
        configFields: [
            // NOTE: Migrated from string slugs to integer congregation IDs.
            // Existing WordPress embeds using data-campus="buckhead" will still work
            // via resolveCampusId() backwards-compatible mapping in the widget.
            {
                key: 'campus',
                label: 'Campus',
                type: 'select',
                defaultValue: '',
                options: [
                    { label: 'All Campuses', value: '' },
                    { label: 'Buckhead', value: '1' },
                    { label: 'Brookhaven', value: '2' },
                    { label: 'Peachtree Corners', value: '3' },
                ],
                description: 'Filter sermons by campus location',
            },
            {
                key: 'perPage',
                label: 'Per Page',
                type: 'number',
                defaultValue: 12,
                description: 'Number of sermons to display per page',
            },
            {
                key: 'defaultTab',
                label: 'Default Tab',
                type: 'select',
                defaultValue: 'sermons',
                options: [
                    { label: 'Sermons', value: 'sermons' },
                    { label: 'Series', value: 'series' },
                ],
                description: 'Which tab to show by default',
            },
            {
                key: 'defaultView',
                label: 'Default View',
                type: 'select',
                defaultValue: 'grid',
                options: [
                    { label: 'Card Grid', value: 'grid' },
                    { label: 'Small List', value: 'list' },
                    { label: 'Large Cards', value: 'large' },
                ],
                description: 'Default sermon list layout',
            },
        ],
    },
];
