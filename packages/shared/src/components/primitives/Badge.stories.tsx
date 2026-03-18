import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './Badge';
import type { Variant } from '../../types/ui';

const meta: Meta<typeof Badge> = {
    title: 'Primitives/Badge',
    component: Badge,
    argTypes: {
        variant: {
            control: 'select',
            options: [
                'primary',
                'secondary',
                'success',
                'warning',
                'error',
                'info',
                'ghost',
            ],
        },
        size: {
            control: 'select',
            options: ['sm', 'md'],
        },
        dot: { control: 'boolean' },
        outline: { control: 'boolean' },
    },
};

export default meta;
type Story = StoryObj<typeof Badge>;

const allVariants: Variant[] = [
    'primary',
    'secondary',
    'success',
    'warning',
    'error',
    'info',
    'ghost',
];

export const AllVariants: Story = {
    render: () => (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {allVariants.map((variant) => (
                <Badge key={variant} variant={variant}>
                    {variant}
                </Badge>
            ))}
        </div>
    ),
};

export const Sizes: Story = {
    render: () => (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Badge size='sm' variant='primary'>
                Small
            </Badge>
            <Badge size='md' variant='primary'>
                Medium
            </Badge>
        </div>
    ),
};

export const WithDot: Story = {
    render: () => (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {allVariants.map((variant) => (
                <Badge key={variant} variant={variant} dot>
                    {variant}
                </Badge>
            ))}
        </div>
    ),
};

export const Outline: Story = {
    render: () => (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {allVariants.map((variant) => (
                <Badge key={variant} variant={variant} outline>
                    {variant}
                </Badge>
            ))}
        </div>
    ),
};
