import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
    title: 'Primitives/Button',
    component: Button,
    argTypes: {
        variant: {
            control: 'select',
            options: ['primary', 'secondary', 'ghost'],
        },
        size: {
            control: 'select',
            options: ['sm', 'md', 'lg'],
        },
        isLoading: { control: 'boolean' },
        disabled: { control: 'boolean' },
    },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
    args: { children: 'Primary Button', variant: 'primary' },
};

export const Secondary: Story = {
    args: { children: 'Secondary Button', variant: 'secondary' },
};

export const Ghost: Story = {
    args: { children: 'Ghost Button', variant: 'ghost' },
};

export const Loading: Story = {
    args: { children: 'Loading...', isLoading: true },
};

export const Disabled: Story = {
    args: { children: 'Disabled', disabled: true },
};

export const Sizes: Story = {
    render: () => (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
        </div>
    ),
};
