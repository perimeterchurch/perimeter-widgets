import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Circle, Tag, Filter } from 'lucide-react';
import { MultiIconSelect, type MultiIconSelectPreset } from './MultiIconSelect';
import type { IconSelectOption } from './IconSelect';

const meta: Meta<typeof MultiIconSelect> = {
    title: 'Composite/MultiIconSelect',
    component: MultiIconSelect,
};

export default meta;
type Story = StoryObj<typeof MultiIconSelect>;

const statusOptions: IconSelectOption[] = [
    { value: 'open', label: 'Open' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'closed', label: 'Closed' },
];

export const Default: Story = {
    render: () => {
        const Wrapper = () => {
            const [value, setValue] = useState<string[]>([]);
            return (
                <MultiIconSelect
                    value={value}
                    onChange={setValue}
                    options={statusOptions}
                    placeholder='Status'
                />
            );
        };
        return <Wrapper />;
    },
};

const presets: MultiIconSelectPreset[] = [
    {
        label: 'Unresolved',
        values: ['open', 'in-progress'],
    },
    {
        label: 'All statuses',
        values: ['open', 'in-progress', 'resolved', 'closed'],
    },
];

export const WithPresets: Story = {
    render: () => {
        const Wrapper = () => {
            const [value, setValue] = useState<string[]>([]);
            return (
                <MultiIconSelect
                    value={value}
                    onChange={setValue}
                    options={statusOptions}
                    presets={presets}
                    placeholder='Status'
                />
            );
        };
        return <Wrapper />;
    },
};

const iconOptions: IconSelectOption[] = [
    {
        value: 'bug',
        label: 'Bug',
        icon: (
            <Circle className='h-3 w-3 fill-red-500 text-red-500 dark:fill-red-400 dark:text-red-400' />
        ),
    },
    {
        value: 'feature',
        label: 'Feature',
        icon: (
            <Circle className='h-3 w-3 fill-blue-500 text-blue-500 dark:fill-blue-400 dark:text-blue-400' />
        ),
    },
    {
        value: 'improvement',
        label: 'Improvement',
        icon: (
            <Circle className='h-3 w-3 fill-green-500 text-green-500 dark:fill-green-400 dark:text-green-400' />
        ),
    },
];

export const WithIcons: Story = {
    render: () => {
        const Wrapper = () => {
            const [value, setValue] = useState<string[]>([]);
            return (
                <MultiIconSelect
                    value={value}
                    onChange={setValue}
                    options={iconOptions}
                    placeholder='Labels'
                    placeholderIcon={<Tag className='h-3.5 w-3.5' />}
                />
            );
        };
        return <Wrapper />;
    },
};

export const FullWidth: Story = {
    render: () => {
        const Wrapper = () => {
            const [value, setValue] = useState<string[]>(['open']);
            return (
                <div className='w-64'>
                    <MultiIconSelect
                        value={value}
                        onChange={setValue}
                        options={statusOptions}
                        placeholder='Filter'
                        placeholderIcon={<Filter className='h-3.5 w-3.5' />}
                        fullWidth
                    />
                </div>
            );
        };
        return <Wrapper />;
    },
};
