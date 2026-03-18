import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { ScaleIn } from './ScaleIn';

const meta: Meta<typeof ScaleIn> = {
    title: 'Motion/ScaleIn',
    component: ScaleIn,
    argTypes: {
        delay: { control: { type: 'number', min: 0, max: 2, step: 0.1 } },
    },
};

export default meta;
type Story = StoryObj<typeof ScaleIn>;

export const Default: Story = {
    args: {
        children: (
            <div className='p-6 bg-stone-100 dark:bg-stone-800 rounded-lg'>
                Scaled in content
            </div>
        ),
    },
};

export const WithDelay: Story = {
    args: {
        delay: 0.3,
        children: (
            <div className='p-6 bg-stone-100 dark:bg-stone-800 rounded-lg'>
                Delayed scale in (0.3s)
            </div>
        ),
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
            <ScaleIn key={key}>
                <div className='p-6 bg-stone-100 dark:bg-stone-800 rounded-lg'>
                    Click Replay to remount
                </div>
            </ScaleIn>
        </div>
    );
}

export const Replay: Story = {
    render: () => <ReplayDemo />,
};
