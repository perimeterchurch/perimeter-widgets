import type { Meta, StoryObj } from '@storybook/react';
import { Input } from './Input';

const meta: Meta<typeof Input> = {
    title: 'Primitives/Input',
    component: Input,
    argTypes: {
        size: {
            control: 'select',
            options: ['xs', 'sm', 'md', 'lg', 'xl'],
        },
        error: { control: 'text' },
        disabled: { control: 'boolean' },
        fullWidth: { control: 'boolean' },
    },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
    args: { placeholder: 'Enter text...' },
};

export const WithError: Story = {
    args: {
        placeholder: 'Enter email...',
        error: 'Invalid email address',
        defaultValue: 'not-an-email',
    },
};

export const Disabled: Story = {
    args: { placeholder: 'Disabled input', disabled: true },
};

export const Sizes: Story = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Input size='xs' placeholder='Extra Small' />
            <Input size='sm' placeholder='Small' />
            <Input size='md' placeholder='Medium' />
            <Input size='lg' placeholder='Large' />
            <Input size='xl' placeholder='Extra Large' />
        </div>
    ),
};

export const FullWidth: Story = {
    args: { placeholder: 'Full width input', fullWidth: true },
};
