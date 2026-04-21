// Registry components — re-exported from the workspace package. This brings
// in all 56 shadcn components (Accordion, Button, Card, etc.) plus `cn`.
export * from '@perimeter-widgets/registry';

// Widget-specific compositions (not in the registry)
export * from './ui/perimeter/icon-select';
export * from './ui/perimeter/sort-select';

// Portal-aware wrappers — override the corresponding named exports from the
// registry star-export above with versions that auto-inject the shadow DOM
// portal container from widget context. ES module semantics resolve the last
// named re-export for a given name, so these win for consumers.
export {
    DialogContent,
    ComboboxContent,
    SelectContent,
    DropdownMenuContent,
    TooltipContent,
    MultiCombobox,
} from './ui/perimeter/portal-wrappers';
