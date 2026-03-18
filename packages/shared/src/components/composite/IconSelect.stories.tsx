import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Circle, Star, Zap, Heart } from 'lucide-react';
import { IconSelect, type IconSelectOption } from './IconSelect';

const meta: Meta<typeof IconSelect> = {
    title: 'Composite/IconSelect',
    component: IconSelect,
};

export default meta;
type Story = StoryObj<typeof IconSelect>;

const basicOptions: IconSelectOption[] = [
    { value: 'draft', label: 'Draft' },
    { value: 'published', label: 'Published' },
    { value: 'archived', label: 'Archived' },
];

export const Default: Story = {
    render: () => {
        const Wrapper = () => {
            const [value, setValue] = useState<string>('draft');
            return (
                <IconSelect
                    value={value}
                    onChange={setValue}
                    options={basicOptions}
                />
            );
        };
        return <Wrapper />;
    },
};

const iconOptions: IconSelectOption[] = [
    {
        value: 'active',
        label: 'Active',
        icon: (
            <Circle className='h-3 w-3 fill-green-500 text-green-500 dark:fill-green-400 dark:text-green-400' />
        ),
    },
    {
        value: 'pending',
        label: 'Pending',
        icon: (
            <Circle className='h-3 w-3 fill-amber-500 text-amber-500 dark:fill-amber-400 dark:text-amber-400' />
        ),
    },
    {
        value: 'inactive',
        label: 'Inactive',
        icon: (
            <Circle className='h-3 w-3 fill-stone-400 text-stone-400 dark:fill-stone-500 dark:text-stone-500' />
        ),
    },
];

export const WithIcons: Story = {
    render: () => {
        const Wrapper = () => {
            const [value, setValue] = useState<string>('active');
            return (
                <IconSelect
                    value={value}
                    onChange={setValue}
                    options={iconOptions}
                />
            );
        };
        return <Wrapper />;
    },
};

export const FullWidth: Story = {
    render: () => {
        const Wrapper = () => {
            const [value, setValue] = useState<string>('active');
            return (
                <div className='w-64'>
                    <IconSelect
                        value={value}
                        onChange={setValue}
                        options={iconOptions}
                        fullWidth
                    />
                </div>
            );
        };
        return <Wrapper />;
    },
};

const categoryOptions: IconSelectOption[] = [
    {
        value: 'featured',
        label: 'Featured',
        icon: <Star className='h-3.5 w-3.5 text-amber-500' />,
    },
    {
        value: 'trending',
        label: 'Trending',
        icon: <Zap className='h-3.5 w-3.5 text-blue-500' />,
    },
    {
        value: 'favorites',
        label: 'Favorites',
        icon: <Heart className='h-3.5 w-3.5 text-rose-500' />,
    },
];

export const WithPlaceholder: Story = {
    render: () => {
        const Wrapper = () => {
            const [value, setValue] = useState<string>('' as string);
            return (
                <IconSelect
                    value={value}
                    onChange={setValue}
                    options={categoryOptions}
                    placeholder='Choose category...'
                />
            );
        };
        return <Wrapper />;
    },
};
