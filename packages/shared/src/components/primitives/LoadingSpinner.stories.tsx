import type { Meta, StoryObj } from '@storybook/react';
import { LoadingSpinner } from './LoadingSpinner';
import type { Size } from '../../types/ui';

const meta: Meta<typeof LoadingSpinner> = {
    title: 'Primitives/LoadingSpinner',
    component: LoadingSpinner,
    argTypes: {
        size: {
            control: 'select',
            options: ['xs', 'sm', 'md', 'lg', 'xl'],
        },
        label: { control: 'text' },
    },
};

export default meta;
type Story = StoryObj<typeof LoadingSpinner>;

export const Default: Story = {
    args: { size: 'md' },
};

const allSizes: Size[] = ['xs', 'sm', 'md', 'lg', 'xl'];

export const AllSizes: Story = {
    render: () => (
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            {allSizes.map((size) => (
                <LoadingSpinner
                    key={size}
                    size={size}
                    label={`${size} spinner`}
                />
            ))}
        </div>
    ),
};
