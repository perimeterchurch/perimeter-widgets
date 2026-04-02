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
    type: 'text' | 'number' | 'boolean' | 'select' | 'multiselect-api';
    /** Default value */
    defaultValue: string | number | boolean;
    /** Options for select fields */
    options?: { label: string; value: string }[];
    /** Help text shown below the field */
    description?: string;
    /** API endpoint path for multiselect-api fields (e.g., '/api/sermons/speakers') */
    apiPath?: string;
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
                label: 'Lock Series',
                type: 'multiselect-api',
                defaultValue: '',
                apiPath: '/api/sermons/series',
                description: 'Lock to specific series (sermons tab only)',
            },
            {
                key: 'speakerId',
                label: 'Lock Speakers',
                type: 'multiselect-api',
                defaultValue: '',
                apiPath: '/api/sermons/speakers',
                description: 'Lock to specific speakers (sermons tab only)',
            },
            {
                key: 'bookId',
                label: 'Lock Books',
                type: 'multiselect-api',
                defaultValue: '',
                apiPath: '/api/sermons/books',
                description: 'Lock to specific books (sermons tab only)',
            },
            {
                key: 'serviceTypeId',
                label: 'Lock Service Types',
                type: 'multiselect-api',
                defaultValue: '',
                apiPath: '/api/sermons/service-types',
                description:
                    'Lock to specific service types (sermons tab only)',
            },
            {
                key: 'seriesTypeId',
                label: 'Lock Series Types',
                type: 'multiselect-api',
                defaultValue: '',
                apiPath: '/api/sermons/series-types',
                description: 'Lock to specific series types',
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
            {
                key: 'hideSeries',
                label: 'Hide Series Filter',
                type: 'boolean',
                defaultValue: false,
                description: 'Hide the series filter dropdown',
            },
            {
                key: 'hideSpeaker',
                label: 'Hide Speaker Filter',
                type: 'boolean',
                defaultValue: false,
                description: 'Hide the speaker filter dropdown',
            },
            {
                key: 'hideBook',
                label: 'Hide Book Filter',
                type: 'boolean',
                defaultValue: false,
                description: 'Hide the book filter dropdown',
            },
            {
                key: 'hideServiceType',
                label: 'Hide Service Type Filter',
                type: 'boolean',
                defaultValue: false,
                description: 'Hide the service type filter dropdown',
            },
            {
                key: 'hideSeriesType',
                label: 'Hide Series Type Filter',
                type: 'boolean',
                defaultValue: false,
                description: 'Hide the series type filter dropdown',
            },
            {
                key: 'hideDate',
                label: 'Hide Date Filter',
                type: 'boolean',
                defaultValue: false,
                description: 'Hide the date range picker',
            },
            {
                key: 'hideSearch',
                label: 'Hide Search',
                type: 'boolean',
                defaultValue: false,
                description: 'Hide the search input',
            },
            {
                key: 'hidePagination',
                label: 'Hide Pagination',
                type: 'boolean',
                defaultValue: false,
                description: 'Hide the pagination controls',
            },
        ],
    },
];
