import type { Meta, StoryObj } from '@storybook/react';
import { Checkbox } from './Checkbox';

const meta: Meta<typeof Checkbox> = {
    title: 'Primitives/Checkbox',
    component: Checkbox,
    argTypes: {
        size: {
            control: 'select',
            options: ['xs', 'sm', 'md', 'lg', 'xl'],
        },
        error: { control: 'boolean' },
        disabled: { control: 'boolean' },
        label: { control: 'text' },
    },
};

export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Default: Story = {
    args: {},
};

export const Checked: Story = {
    args: { defaultChecked: true },
};

export const WithLabel: Story = {
    args: { label: 'Accept terms and conditions' },
};

export const Disabled: Story = {
    args: { label: 'Disabled checkbox', disabled: true },
};

export const Error: Story = {
    args: { label: 'Required field', error: true },
};
