import type { Meta, StoryObj } from '@storybook/react';
import { Select } from './Select';

const meta: Meta<typeof Select> = {
    title: 'Primitives/Select',
    component: Select,
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
type Story = StoryObj<typeof Select>;

const sampleOptions = [
    { value: '', label: 'Select an option' },
    { value: '1', label: 'Option 1' },
    { value: '2', label: 'Option 2' },
    { value: '3', label: 'Option 3' },
];

export const Default: Story = {
    args: {},
    render: (args) => (
        <Select {...args}>
            <option value=''>Select an option</option>
            <option value='1'>Option 1</option>
            <option value='2'>Option 2</option>
        </Select>
    ),
};

export const WithOptions: Story = {
    args: { options: sampleOptions },
};

export const WithError: Story = {
    args: { options: sampleOptions, error: true },
};

export const Disabled: Story = {
    args: { options: sampleOptions, disabled: true },
};

export const Sizes: Story = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Select size='xs' options={sampleOptions} />
            <Select size='sm' options={sampleOptions} />
            <Select size='md' options={sampleOptions} />
            <Select size='lg' options={sampleOptions} />
            <Select size='xl' options={sampleOptions} />
        </div>
    ),
};

export const FullWidth: Story = {
    args: { options: sampleOptions, fullWidth: true },
};
