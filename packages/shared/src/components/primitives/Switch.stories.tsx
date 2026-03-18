import type { Meta, StoryObj } from '@storybook/react';
import { Switch } from './Switch';

const meta: Meta<typeof Switch> = {
    title: 'Primitives/Switch',
    component: Switch,
    argTypes: {
        size: {
            control: 'select',
            options: ['xs', 'sm', 'md', 'lg', 'xl'],
        },
        disabled: { control: 'boolean' },
        label: { control: 'text' },
    },
};

export default meta;
type Story = StoryObj<typeof Switch>;

export const Default: Story = {
    args: {},
};

export const Checked: Story = {
    args: { defaultChecked: true },
};

export const WithLabel: Story = {
    args: { label: 'Enable notifications' },
};

export const Disabled: Story = {
    args: { label: 'Disabled switch', disabled: true },
};
