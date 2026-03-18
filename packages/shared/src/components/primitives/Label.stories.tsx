import type { Meta, StoryObj } from '@storybook/react';
import { Label } from './Label';

const meta: Meta<typeof Label> = {
    title: 'Primitives/Label',
    component: Label,
    argTypes: {
        required: { control: 'boolean' },
        disabled: { control: 'boolean' },
    },
};

export default meta;
type Story = StoryObj<typeof Label>;

export const Default: Story = {
    args: { children: 'Email Address', htmlFor: 'email' },
};

export const Required: Story = {
    args: { children: 'Email Address', htmlFor: 'email', required: true },
};

export const Disabled: Story = {
    args: { children: 'Email Address', htmlFor: 'email', disabled: true },
};
