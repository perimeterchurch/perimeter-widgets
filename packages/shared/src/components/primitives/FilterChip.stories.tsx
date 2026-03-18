import type { Meta, StoryObj } from '@storybook/react';
import { FilterChip } from './FilterChip';

const meta: Meta<typeof FilterChip> = {
    title: 'Primitives/FilterChip',
    component: FilterChip,
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
            options: ['xs', 'sm', 'md', 'lg', 'xl'],
        },
    },
};

export default meta;
type Story = StoryObj<typeof FilterChip>;

export const Default: Story = {
    args: { label: 'Filter' },
};

export const WithRemove: Story = {
    args: {
        label: 'Status: Active',
        onRemove: () => {},
    },
};

export const AllVariants: Story = {
    render: () => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <FilterChip label='Primary' variant='primary' onRemove={() => {}} />
            <FilterChip
                label='Secondary'
                variant='secondary'
                onRemove={() => {}}
            />
            <FilterChip label='Success' variant='success' onRemove={() => {}} />
            <FilterChip label='Warning' variant='warning' onRemove={() => {}} />
            <FilterChip label='Error' variant='error' onRemove={() => {}} />
            <FilterChip label='Info' variant='info' onRemove={() => {}} />
            <FilterChip label='Ghost' variant='ghost' onRemove={() => {}} />
        </div>
    ),
};
