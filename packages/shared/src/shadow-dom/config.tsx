import { createContext, useContext, type ReactNode } from 'react';

export type WidgetConfig = Record<string, string | number | boolean>;

const ConfigContext = createContext<WidgetConfig | null>(null);

export function ConfigProvider({
    config,
    children,
}: {
    config: WidgetConfig;
    children: ReactNode;
}) {
    return (
        <ConfigContext.Provider value={config}>
            {children}
        </ConfigContext.Provider>
    );
}

export function useConfig<T extends WidgetConfig = WidgetConfig>(): T {
    const ctx = useContext(ConfigContext);
    if (!ctx) {
        throw new Error('useConfig must be used within a ConfigProvider');
    }
    return ctx as T;
}

/**
 * Reads data-* attributes from an HTML element and converts them to a config object.
 * Converts kebab-case to camelCase: data-per-page -> perPage
 * Attempts to parse numbers and booleans from string values.
 */
export function parseDataAttributes(element: HTMLElement): WidgetConfig {
    const config: WidgetConfig = {};

    for (const [key, value] of Object.entries(element.dataset)) {
        if (value === undefined) continue;
        if (value === 'true') {
            config[key] = true;
        } else if (value === 'false') {
            config[key] = false;
        } else if (value !== '' && !isNaN(Number(value))) {
            config[key] = Number(value);
        } else {
            config[key] = value;
        }
    }

    return config;
}
