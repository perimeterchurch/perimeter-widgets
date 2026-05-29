import type { WidgetDefinition } from '@perimeter/widget-runtime';

/**
 * Type entry for consumers (e.g. the Studio app) that import the package by its
 * bare specifier. Pointing `exports.types` here keeps cross-package type-checks
 * from traversing the widget's Vite source (which relies on `import.meta.env`
 * augmentation that only exists inside this package's own tsconfig program).
 */
declare const sermonsWidget: WidgetDefinition;
export default sermonsWidget;
