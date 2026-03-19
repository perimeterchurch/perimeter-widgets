import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { SearchInput } from './SearchInput';

const meta: Meta<typeof SearchInput> = {
    title: 'Primitives/SearchInput',
    component: SearchInput,
};

export default meta;
type Story = StoryObj<typeof SearchInput>;

export const Default: Story = {
    render: () => {
        const Wrapper = () => {
            const [value, setValue] = useState('');
            const [debouncedValue, setDebouncedValue] = useState('');
            return (
                <div className='flex flex-col gap-4 w-full max-w-sm'>
                    <SearchInput
                        value={value}
                        onChange={(v) => {
                            setValue(v);
                            setDebouncedValue(v);
                        }}
                        placeholder='Search sermons...'
                    />
                    <div className='text-sm text-stone-500'>
                        Debounced value:{' '}
                        <span className='font-medium text-stone-800'>
                            {debouncedValue || '(empty)'}
                        </span>
                    </div>
                </div>
            );
        };
        return <Wrapper />;
    },
};

export const WithInitialValue: Story = {
    render: () => {
        const Wrapper = () => {
            const [value, setValue] = useState('grace');
            return (
                <div className='w-full max-w-sm'>
                    <SearchInput
                        value={value}
                        onChange={setValue}
                        placeholder='Search...'
                    />
                </div>
            );
        };
        return <Wrapper />;
    },
};
