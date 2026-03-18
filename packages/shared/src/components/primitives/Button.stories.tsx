import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
    title: 'Primitives/Button',
    component: Button,
    argTypes: {
        variant: {
            control: 'select',
            options: [
                'primary',
                'secondary',
                'ghost',
                'success',
                'warning',
                'error',
                'info',
            ],
        },
        size: {
            control: 'select',
            options: ['xs', 'sm', 'md', 'lg', 'xl'],
        },
        isLoading: { control: 'boolean' },
        disabled: { control: 'boolean' },
        outline: { control: 'boolean' },
        fullWidth: { control: 'boolean' },
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

export const Success: Story = {
    args: { children: 'Success Button', variant: 'success' },
};

export const Warning: Story = {
    args: { children: 'Warning Button', variant: 'warning' },
};

export const Error: Story = {
    args: { children: 'Error Button', variant: 'error' },
};

export const Info: Story = {
    args: { children: 'Info Button', variant: 'info' },
};

export const Outline: Story = {
    args: { children: 'Outline Button', variant: 'primary', outline: true },
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
            <Button size='xs'>Extra Small</Button>
            <Button size='sm'>Small</Button>
            <Button size='md'>Medium</Button>
            <Button size='lg'>Large</Button>
            <Button size='xl'>Extra Large</Button>
        </div>
    ),
};

export const FullWidth: Story = {
    args: { children: 'Full Width Button', fullWidth: true },
};
