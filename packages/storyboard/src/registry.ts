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
            {
                key: 'serviceTypes',
                label: 'Service Types',
                type: 'text',
                defaultValue: '',
                description:
                    'Comma-separated service type names to filter by (e.g., "Worship Service,Youth"). Leave blank to show a dropdown filter instead.',
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
            {
                key: 'tab',
                label: 'Tab Lock',
                type: 'select',
                defaultValue: '',
                options: [
                    { label: 'Both (default)', value: '' },
                    { label: 'Sermons only', value: 'sermons' },
                    { label: 'Series only', value: 'series' },
                ],
                description: 'Lock to a single tab and hide the tab switcher',
            },
            {
                key: 'display',
                label: 'Display Mode',
                type: 'select',
                defaultValue: 'full',
                options: [
                    { label: 'Full', value: 'full' },
                    { label: 'Compact', value: 'compact' },
                    { label: 'Headless', value: 'headless' },
                ],
                description:
                    'Chrome level: full (all UI), compact (sort/view/grid/pagination), headless (grid/pagination only)',
            },
            {
                key: 'seriesId',
                label: 'Lock Series ID',
                type: 'number',
                defaultValue: '',
                description: 'Lock to a specific series (sermons tab only)',
            },
            {
                key: 'speakerId',
                label: 'Lock Speaker ID',
                type: 'number',
                defaultValue: '',
                description: 'Lock to a specific speaker (sermons tab only)',
            },
            {
                key: 'bookId',
                label: 'Lock Book ID',
                type: 'number',
                defaultValue: '',
                description: 'Lock to a specific book (sermons tab only)',
            },
            {
                key: 'serviceTypeId',
                label: 'Lock Service Type IDs',
                type: 'text',
                defaultValue: '',
                description:
                    'Comma-separated service type IDs to lock (sermons tab only)',
            },
            {
                key: 'from',
                label: 'Lock Start Date',
                type: 'text',
                defaultValue: '',
                description: 'Lock start date YYYY-MM-DD (sermons tab only)',
            },
            {
                key: 'to',
                label: 'Lock End Date',
                type: 'text',
                defaultValue: '',
                description: 'Lock end date YYYY-MM-DD (sermons tab only)',
            },
        ],
    },
];
