import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { AnimatedList } from './AnimatedList';

const meta: Meta<typeof AnimatedList> = {
    title: 'Motion/AnimatedList',
    component: AnimatedList,
    argTypes: {
        as: {
            control: 'select',
            options: ['div', 'ul', 'ol'],
        },
        staggerDelay: {
            control: { type: 'number', min: 0.01, max: 0.3, step: 0.01 },
        },
    },
};

export default meta;
type Story = StoryObj<typeof AnimatedList>;

const items = [
    'First item',
    'Second item',
    'Third item',
    'Fourth item',
    'Fifth item',
];

export const Default: Story = {
    args: {
        children: items.map((item) => (
            <div
                key={item}
                className='px-4 py-3 bg-stone-100 dark:bg-stone-800 rounded-md mb-2'
            >
                {item}
            </div>
        )),
    },
};

export const AsList: Story = {
    args: {
        as: 'ul',
        children: items.map((item) => (
            <div
                key={item}
                className='px-4 py-3 bg-stone-100 dark:bg-stone-800 rounded-md mb-2'
            >
                {item}
            </div>
        )),
    },
};

function ReplayDemo() {
    const [key, setKey] = useState(0);
    return (
        <div>
            <button
                onClick={() => setKey((k) => k + 1)}
                className='mb-4 px-3 py-1.5 rounded bg-stone-200 dark:bg-stone-700 text-stone-900 dark:text-stone-100 hover:bg-stone-300 dark:hover:bg-stone-600'
            >
                Replay
            </button>
            <AnimatedList key={key}>
                {items.map((item) => (
                    <div
                        key={item}
                        className='px-4 py-3 bg-stone-100 dark:bg-stone-800 rounded-md mb-2'
                    >
                        {item}
                    </div>
                ))}
            </AnimatedList>
        </div>
    );
}

export const Replay: Story = {
    render: () => <ReplayDemo />,
};
