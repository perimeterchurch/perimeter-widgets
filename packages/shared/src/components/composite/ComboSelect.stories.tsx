import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { User, MapPin, Search } from 'lucide-react';
import { ComboSelect, type ComboSelectOption } from './ComboSelect';

const meta: Meta<typeof ComboSelect> = {
    title: 'Composite/ComboSelect',
    component: ComboSelect,
};

export default meta;
type Story = StoryObj<typeof ComboSelect>;

const peopleOptions: ComboSelectOption[] = [
    { value: 'alice', label: 'Alice Johnson' },
    { value: 'bob', label: 'Bob Smith' },
    { value: 'carol', label: 'Carol Williams' },
    { value: 'david', label: 'David Brown' },
    { value: 'eve', label: 'Eve Davis' },
];

export const Default: Story = {
    render: () => {
        const Wrapper = () => {
            const [value, setValue] = useState<string>('');
            return (
                <ComboSelect
                    value={value}
                    onChange={setValue}
                    options={peopleOptions}
                    placeholder='Select person...'
                    placeholderIcon={<Search className='h-3.5 w-3.5' />}
                />
            );
        };
        return <Wrapper />;
    },
};

export const MultiSelect: Story = {
    render: () => {
        const Wrapper = () => {
            const [value, setValue] = useState<string[]>([]);
            return (
                <ComboSelect
                    multiple
                    value={value}
                    onChange={setValue}
                    options={peopleOptions}
                    placeholder='People'
                    placeholderIcon={<User className='h-3.5 w-3.5' />}
                />
            );
        };
        return <Wrapper />;
    },
};

const locationOptions: ComboSelectOption[] = [
    {
        value: 'atl',
        label: 'Atlanta',
        icon: <MapPin className='h-3.5 w-3.5 text-blue-500' />,
    },
    {
        value: 'nyc',
        label: 'New York',
        icon: <MapPin className='h-3.5 w-3.5 text-green-500' />,
    },
    {
        value: 'la',
        label: 'Los Angeles',
        icon: <MapPin className='h-3.5 w-3.5 text-amber-500' />,
    },
    {
        value: 'chi',
        label: 'Chicago',
        icon: <MapPin className='h-3.5 w-3.5 text-red-500' />,
    },
];

export const WithIcons: Story = {
    render: () => {
        const Wrapper = () => {
            const [value, setValue] = useState<string>('');
            return (
                <ComboSelect
                    value={value}
                    onChange={setValue}
                    options={locationOptions}
                    placeholder='Select city...'
                    placeholderIcon={<MapPin className='h-3.5 w-3.5' />}
                />
            );
        };
        return <Wrapper />;
    },
};

export const Loading: Story = {
    render: () => {
        const Wrapper = () => {
            const [value, setValue] = useState<string>('');
            return (
                <ComboSelect
                    value={value}
                    onChange={setValue}
                    options={[]}
                    placeholder='Loading...'
                    loading
                />
            );
        };
        return <Wrapper />;
    },
};

export const WithAllOption: Story = {
    render: () => {
        const Wrapper = () => {
            const [value, setValue] = useState<string>('');
            return (
                <ComboSelect
                    value={value}
                    onChange={setValue}
                    options={peopleOptions}
                    placeholder='All people'
                    placeholderIcon={<User className='h-3.5 w-3.5' />}
                    showAllOption
                    allOptionLabel='All People'
                />
            );
        };
        return <Wrapper />;
    },
};

export const EmptySearch: Story = {
    render: () => {
        const Wrapper = () => {
            const [value, setValue] = useState<string>('');
            return (
                <ComboSelect
                    value={value}
                    onChange={setValue}
                    options={[]}
                    placeholder='Search...'
                    placeholderIcon={<Search className='h-3.5 w-3.5' />}
                    emptyText='No matching results. Try a different search.'
                />
            );
        };
        return <Wrapper />;
    },
};
