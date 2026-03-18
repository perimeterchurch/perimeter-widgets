import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { CountUp } from './CountUp';

const meta: Meta<typeof CountUp> = {
    title: 'Motion/CountUp',
    component: CountUp,
    argTypes: {
        value: { control: { type: 'number', min: 0, max: 100000, step: 100 } },
    },
};

export default meta;
type Story = StoryObj<typeof CountUp>;

export const Default: Story = {
    args: {
        value: 1234,
    },
};

function InteractiveDemo() {
    const [value, setValue] = useState(0);
    return (
        <div>
            <div style={{ fontSize: 32, marginBottom: 16 }}>
                <CountUp value={value} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
                <button
                    onClick={() => setValue((v) => v + 100)}
                    className='px-3 py-1.5 rounded bg-stone-200 dark:bg-stone-700 text-stone-900 dark:text-stone-100 hover:bg-stone-300 dark:hover:bg-stone-600'
                >
                    +100
                </button>
                <button
                    onClick={() => setValue((v) => v + 1000)}
                    className='px-3 py-1.5 rounded bg-stone-200 dark:bg-stone-700 text-stone-900 dark:text-stone-100 hover:bg-stone-300 dark:hover:bg-stone-600'
                >
                    +1,000
                </button>
                <button
                    onClick={() => setValue(0)}
                    className='px-3 py-1.5 rounded bg-stone-200 dark:bg-stone-700 text-stone-900 dark:text-stone-100 hover:bg-stone-300 dark:hover:bg-stone-600'
                >
                    Reset
                </button>
            </div>
        </div>
    );
}

export const Interactive: Story = {
    render: () => <InteractiveDemo />,
};

function CurrencyDemo() {
    const [value, setValue] = useState(4250);
    return (
        <div>
            <div style={{ fontSize: 32, marginBottom: 16 }}>
                $
                <CountUp
                    value={value}
                    format={(v) =>
                        v.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        })
                    }
                />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
                <button
                    onClick={() => setValue(9999.99)}
                    className='px-3 py-1.5 rounded bg-stone-200 dark:bg-stone-700 text-stone-900 dark:text-stone-100 hover:bg-stone-300 dark:hover:bg-stone-600'
                >
                    $9,999.99
                </button>
                <button
                    onClick={() => setValue(250.5)}
                    className='px-3 py-1.5 rounded bg-stone-200 dark:bg-stone-700 text-stone-900 dark:text-stone-100 hover:bg-stone-300 dark:hover:bg-stone-600'
                >
                    $250.50
                </button>
                <button
                    onClick={() => setValue(0)}
                    className='px-3 py-1.5 rounded bg-stone-200 dark:bg-stone-700 text-stone-900 dark:text-stone-100 hover:bg-stone-300 dark:hover:bg-stone-600'
                >
                    $0.00
                </button>
            </div>
        </div>
    );
}

export const Currency: Story = {
    render: () => <CurrencyDemo />,
};
