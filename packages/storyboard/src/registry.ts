/**
 * Widget registry — defines all widgets available in the storyboard
 * with their configurable fields, defaults, and metadata.
 */

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
    /** Package export paths */
    imports: {
        app: string;
        styles: string;
    };
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
        status: 'skeleton',
        imports: {
            app: '@perimeter-widgets/widget-sermons/app',
            styles: '@perimeter-widgets/widget-sermons/styles?inline',
        },
        configFields: [
            {
                key: 'campus',
                label: 'Campus',
                type: 'select',
                defaultValue: '',
                options: [
                    { label: 'All Campuses', value: '' },
                    { label: 'Buckhead', value: 'buckhead' },
                    { label: 'Brookhaven', value: 'brookhaven' },
                    { label: 'Peachtree Corners', value: 'peachtree-corners' },
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
        ],
    },
];
