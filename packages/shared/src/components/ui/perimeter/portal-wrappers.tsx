/**
 * Portal-aware component wrappers.
 *
 * These wrap style registry components with automatic portal container injection
 * for shadow DOM support. Widget code imports from here (via the barrel export)
 * instead of the base components when portal behavior is needed.
 *
 * The base components accept optional `container`/`environment` props.
 * These wrappers read the portal container from context and pass it automatically.
 */
import type { ComponentProps } from 'react';
import { usePortalContainer } from '../../../shadow-dom/portal-container';
import { useShadowEnvironment } from '../../../shadow-dom/shadow-environment';

import {
    DialogContent as BaseDialogContent,
    ComboboxContent as BaseComboboxContent,
    SelectContent as BaseSelectContent,
    DropdownMenuContent as BaseDropdownMenuContent,
    TooltipContent as BaseTooltipContent,
    MultiCombobox as BaseMultiCombobox,
    type MultiComboboxProps,
} from '@perimeter-widgets/registry';

function DialogContent(props: ComponentProps<typeof BaseDialogContent>) {
    const container = usePortalContainer();
    return <BaseDialogContent container={container} {...props} />;
}

function ComboboxContent(props: ComponentProps<typeof BaseComboboxContent>) {
    const container = usePortalContainer();
    return <BaseComboboxContent container={container} {...props} />;
}

function SelectContent(props: ComponentProps<typeof BaseSelectContent>) {
    const container = usePortalContainer();
    return <BaseSelectContent container={container} {...props} />;
}

function DropdownMenuContent(
    props: ComponentProps<typeof BaseDropdownMenuContent>,
) {
    const container = usePortalContainer();
    return <BaseDropdownMenuContent container={container} {...props} />;
}

function TooltipContent(props: ComponentProps<typeof BaseTooltipContent>) {
    const container = usePortalContainer();
    return <BaseTooltipContent container={container} {...props} />;
}

function MultiCombobox(props: MultiComboboxProps) {
    const environment = useShadowEnvironment();
    return <BaseMultiCombobox environment={environment} {...props} />;
}

export {
    DialogContent,
    ComboboxContent,
    SelectContent,
    DropdownMenuContent,
    TooltipContent,
    MultiCombobox,
};
