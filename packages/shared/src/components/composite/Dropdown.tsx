/**
 * Dropdown/Menu Component
 * Dropdown menu using Headless UI with keyboard navigation and positioning
 */

import {
    Menu,
    MenuButton,
    MenuItem,
    MenuItems,
    type MenuItemsProps,
} from '@headlessui/react';
import { forwardRef, type ReactNode } from 'react';
import type { BaseComponentProps } from '../../types/ui';
import { cn } from '../utils/cn';

export interface DropdownProps extends BaseComponentProps {
    /** Trigger button content */
    trigger: ReactNode;
    /** Menu items */
    children: ReactNode;
    /** Menu alignment */
    align?: 'left' | 'right';
    /** Anchor placement override (Headless UI anchor prop) */
    anchor?: MenuItemsProps['anchor'];
    /** Additional class names */
    className?: string;
}

export interface DropdownItemProps extends BaseComponentProps {
    /** Item content */
    children: ReactNode;
    /** Click handler */
    onClick?: () => void;
    /** Disabled state */
    disabled?: boolean;
    /** Destructive/danger styling */
    destructive?: boolean;
    /** Additional class names */
    className?: string;
}

/**
 * Dropdown component with keyboard navigation
 *
 * @example
 * <Dropdown trigger={<Button>Options</Button>}>
 *   <Dropdown.Item onClick={handleEdit}>Edit</Dropdown.Item>
 *   <Dropdown.Item onClick={handleDuplicate}>Duplicate</Dropdown.Item>
 *   <Dropdown.Divider />
 *   <Dropdown.Item destructive onClick={handleDelete}>Delete</Dropdown.Item>
 * </Dropdown>
 */
const DropdownBase = forwardRef<HTMLDivElement, DropdownProps>(
    (
        { trigger, children, align = 'right', anchor: anchorProp, className },
        ref,
    ) => {
        const resolvedAnchor =
            anchorProp ?? (align === 'right' ? 'bottom end' : 'bottom start');
        return (
            <Menu
                as='div'
                className={cn('relative inline-block text-left', className)}
                ref={ref}
            >
                <MenuButton as='div'>{trigger}</MenuButton>

                <MenuItems
                    transition
                    anchor={resolvedAnchor}
                    className={cn(
                        'z-[var(--z-dropdown,1000)]',
                        '[--anchor-gap:8px] w-56 origin-top-right',
                        'rounded-lg bg-[var(--color-popover)] text-[var(--color-popover-foreground)] shadow-lg ring-1 ring-[var(--color-border)]',
                        'dark:bg-stone-900 dark:text-stone-100 dark:ring-stone-700',
                        'focus:outline-none',
                        'transition duration-200',
                        'data-[closed]:scale-95 data-[closed]:opacity-0',
                    )}
                >
                    <div className='py-1'>{children}</div>
                </MenuItems>
            </Menu>
        );
    },
);

DropdownBase.displayName = 'Dropdown';

/**
 * Dropdown Item
 */
export const DropdownItem = forwardRef<HTMLButtonElement, DropdownItemProps>(
    (
        { children, onClick, disabled = false, destructive = false, className },
        ref,
    ) => {
        return (
            <MenuItem disabled={disabled}>
                {({ focus }) => (
                    <button
                        ref={ref}
                        onClick={onClick}
                        className={cn(
                            'group flex w-full items-center px-4 py-2 text-sm',
                            'transition-colors duration-150',
                            focus
                                && !disabled
                                && 'bg-[var(--color-accent)] text-[var(--color-accent-foreground)] dark:bg-stone-800 dark:text-stone-100',
                            disabled ?
                                'cursor-not-allowed opacity-50'
                            :   'cursor-pointer',
                            !disabled
                                && !destructive
                                && 'text-[var(--color-popover-foreground)] dark:text-stone-200',
                            !disabled
                                && destructive
                                && 'text-[var(--color-error)] dark:text-red-400',
                            className,
                        )}
                    >
                        {children}
                    </button>
                )}
            </MenuItem>
        );
    },
);

DropdownItem.displayName = 'Dropdown.Item';

/**
 * Dropdown Divider
 */
export const DropdownDivider = () => {
    return (
        <div
            className='my-1 h-px bg-[var(--color-border)] dark:bg-stone-700'
            role='separator'
        />
    );
};

DropdownDivider.displayName = 'Dropdown.Divider';

// Attach subcomponents with proper typing
interface DropdownComponent extends React.ForwardRefExoticComponent<
    DropdownProps & React.RefAttributes<HTMLDivElement>
> {
    Item: typeof DropdownItem;
    Divider: typeof DropdownDivider;
}

const DropdownWithSubcomponents = Object.assign(DropdownBase, {
    Item: DropdownItem,
    Divider: DropdownDivider,
}) as DropdownComponent;

export { DropdownWithSubcomponents as Dropdown };
export type { DropdownProps as DropdownPropsType };
