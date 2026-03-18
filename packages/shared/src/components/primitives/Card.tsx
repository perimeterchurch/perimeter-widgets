/**
 * Card Component
 * Container component with optional Header, Body, and Footer subcomponents
 */

import {
    forwardRef,
    type ComponentPropsWithoutRef,
    type ElementRef,
} from 'react';
import type { BaseComponentProps } from '../../types/ui';
import { cn } from '../utils/cn';

type CardElement = ElementRef<'div'>;
type CardHeaderElement = ElementRef<'div'>;
type CardBodyElement = ElementRef<'div'>;
type CardFooterElement = ElementRef<'div'>;

export interface CardProps
    extends ComponentPropsWithoutRef<'div'>, BaseComponentProps {
    /** Apply hover effect */
    hoverable?: boolean;
}

export interface CardHeaderProps
    extends ComponentPropsWithoutRef<'div'>, BaseComponentProps {}
export interface CardBodyProps
    extends ComponentPropsWithoutRef<'div'>, BaseComponentProps {}
export interface CardFooterProps
    extends ComponentPropsWithoutRef<'div'>, BaseComponentProps {}

/**
 * Card root component
 *
 * @example
 * <Card>
 *   <Card.Header>
 *     <h2>Title</h2>
 *   </Card.Header>
 *   <Card.Body>
 *     <p>Content goes here</p>
 *   </Card.Body>
 *   <Card.Footer>
 *     <Button>Action</Button>
 *   </Card.Footer>
 * </Card>
 */
const CardRoot = forwardRef<CardElement, CardProps>(
    ({ hoverable = false, className, children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    // Base styles
                    'rounded-xl border border-stone-200 bg-white text-stone-900',
                    'shadow-sm',
                    // Dark mode
                    'dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100',
                    // Hover effect
                    hoverable
                        && 'transition-shadow duration-200 hover:shadow-md',
                    className,
                )}
                {...props}
            >
                {children}
            </div>
        );
    },
);

CardRoot.displayName = 'Card';

/**
 * Card Header subcomponent
 */
export const CardHeader = forwardRef<CardHeaderElement, CardHeaderProps>(
    ({ className, children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn('flex flex-col space-y-1.5 p-6', className)}
                {...props}
            >
                {children}
            </div>
        );
    },
);

CardHeader.displayName = 'Card.Header';

/**
 * Card Body subcomponent
 */
export const CardBody = forwardRef<CardBodyElement, CardBodyProps>(
    ({ className, children, ...props }, ref) => {
        return (
            <div ref={ref} className={cn('p-6 pt-0', className)} {...props}>
                {children}
            </div>
        );
    },
);

CardBody.displayName = 'Card.Body';

/**
 * Card Footer subcomponent
 */
export const CardFooter = forwardRef<CardFooterElement, CardFooterProps>(
    ({ className, children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn('flex items-center p-6 pt-0', className)}
                {...props}
            >
                {children}
            </div>
        );
    },
);

CardFooter.displayName = 'Card.Footer';

// Attach subcomponents to Card via Object.assign
export const Card = Object.assign(CardRoot, {
    Header: CardHeader,
    Body: CardBody,
    Footer: CardFooter,
});
