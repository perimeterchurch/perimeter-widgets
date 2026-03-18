import type { Meta, StoryObj } from '@storybook/react';
import { Textarea } from './Textarea';

const meta: Meta<typeof Textarea> = {
    title: 'Primitives/Textarea',
    component: Textarea,
    argTypes: {
        size: {
            control: 'select',
            options: ['xs', 'sm', 'md', 'lg', 'xl'],
        },
        error: { control: 'boolean' },
        disabled: { control: 'boolean' },
        fullWidth: { control: 'boolean' },
    },
};

export default meta;
type Story = StoryObj<typeof Textarea>;

export const Default: Story = {
    args: { placeholder: 'Enter your message...' },
};

export const WithError: Story = {
    args: {
        placeholder: 'Enter your message...',
        error: true,
        defaultValue: 'Some invalid content',
    },
};

export const Disabled: Story = {
    args: { placeholder: 'Disabled textarea', disabled: true },
};

export const CustomRows: Story = {
    args: { placeholder: 'Textarea with 6 rows', rows: 6 },
};
