/** Turn camelCase config keys into kebab-case data-* attribute names */
export function toDataAttr(key: string): string {
    return `data-${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`;
}

/** Turn config key/value pairs into stringified data-* attribute pairs,
 *  omitting empty strings and false booleans (which indicate "default" in our schema). */
export function configToDataAttrs(
    config: Record<string, string | number | boolean>,
): Record<string, string> {
    const attrs: Record<string, string> = {};
    for (const [key, value] of Object.entries(config)) {
        if (value === '' || value === false) continue;
        attrs[toDataAttr(key)] = String(value);
    }
    return attrs;
}

/** Build the inline data-* string used in the embed snippet (e.g. `data-per-page="12" data-display="full"`) */
export function configToAttrString(
    config: Record<string, string | number | boolean>,
): string {
    const attrs = configToDataAttrs(config);
    return Object.entries(attrs)
        .map(([k, v]) => `${k}="${v}"`)
        .join(' ');
}
