import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { AnimatedPanel } from './AnimatedPanel';

const meta: Meta<typeof AnimatedPanel> = {
    title: 'Motion/AnimatedPanel',
    component: AnimatedPanel,
    argTypes: {
        width: { control: { type: 'number', min: 200, max: 600, step: 10 } },
        backdrop: { control: 'boolean' },
    },
};

export default meta;
type Story = StoryObj<typeof AnimatedPanel>;

function DefaultDemo() {
    const [open, setOpen] = useState(false);
    return (
        <div>
            <button
                onClick={() => setOpen(true)}
                className="px-3 py-1.5 rounded bg-stone-200 dark:bg-stone-700 text-stone-900 dark:text-stone-100 hover:bg-stone-300 dark:hover:bg-stone-600"
            >
                Open Panel
            </button>
            <AnimatedPanel open={open} onClose={() => setOpen(false)}>
                <div className="p-6 bg-white dark:bg-stone-900 h-full shadow-[-2px_0_8px_rgba(0,0,0,0.1)] dark:shadow-[-2px_0_8px_rgba(0,0,0,0.3)]">
                    <h3 style={{ marginTop: 0 }}>Panel Content</h3>
                    <p>Press Escape or click backdrop to close.</p>
                    <button
                        onClick={() => setOpen(false)}
                        className="px-3 py-1.5 rounded bg-stone-200 dark:bg-stone-700 text-stone-900 dark:text-stone-100 hover:bg-stone-300 dark:hover:bg-stone-600"
                    >
                        Close
                    </button>
                </div>
            </AnimatedPanel>
        </div>
    );
}

export const Default: Story = {
    render: () => <DefaultDemo />,
};

function WithBackdropDemo() {
    const [open, setOpen] = useState(false);
    return (
        <div>
            <button
                onClick={() => setOpen(true)}
                className="px-3 py-1.5 rounded bg-stone-200 dark:bg-stone-700 text-stone-900 dark:text-stone-100 hover:bg-stone-300 dark:hover:bg-stone-600"
            >
                Open Panel with Backdrop
            </button>
            <AnimatedPanel open={open} onClose={() => setOpen(false)} backdrop>
                <div className="p-6 bg-white dark:bg-stone-900 h-full shadow-[-2px_0_8px_rgba(0,0,0,0.1)] dark:shadow-[-2px_0_8px_rgba(0,0,0,0.3)]">
                    <h3 style={{ marginTop: 0 }}>Panel with Backdrop</h3>
                    <p>Click backdrop or press Escape to close.</p>
                    <button
                        onClick={() => setOpen(false)}
                        className="px-3 py-1.5 rounded bg-stone-200 dark:bg-stone-700 text-stone-900 dark:text-stone-100 hover:bg-stone-300 dark:hover:bg-stone-600"
                    >
                        Close
                    </button>
                </div>
            </AnimatedPanel>
        </div>
    );
}

export const WithBackdrop: Story = {
    render: () => <WithBackdropDemo />,
};

function CustomWidthDemo() {
    const [open, setOpen] = useState(false);
    return (
        <div>
            <button
                onClick={() => setOpen(true)}
                className="px-3 py-1.5 rounded bg-stone-200 dark:bg-stone-700 text-stone-900 dark:text-stone-100 hover:bg-stone-300 dark:hover:bg-stone-600"
            >
                Open Wide Panel (500px)
            </button>
            <AnimatedPanel
                open={open}
                onClose={() => setOpen(false)}
                width={500}
                backdrop
            >
                <div className="p-6 bg-white dark:bg-stone-900 h-full shadow-[-2px_0_8px_rgba(0,0,0,0.1)] dark:shadow-[-2px_0_8px_rgba(0,0,0,0.3)]">
                    <h3 style={{ marginTop: 0 }}>Wide Panel (500px)</h3>
                    <button
                        onClick={() => setOpen(false)}
                        className="px-3 py-1.5 rounded bg-stone-200 dark:bg-stone-700 text-stone-900 dark:text-stone-100 hover:bg-stone-300 dark:hover:bg-stone-600"
                    >
                        Close
                    </button>
                </div>
            </AnimatedPanel>
        </div>
    );
}

export const CustomWidth: Story = {
    render: () => <CustomWidthDemo />,
};
