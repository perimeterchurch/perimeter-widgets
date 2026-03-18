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

export const Default: Story = {
    render: () => {
        const [open, setOpen] = useState(false);
        return (
            <div>
                <button onClick={() => setOpen(true)}>Open Panel</button>
                <AnimatedPanel open={open} onClose={() => setOpen(false)}>
                    <div
                        style={{
                            padding: 24,
                            background: '#fff',
                            height: '100%',
                            boxShadow: '-2px 0 8px rgba(0,0,0,0.1)',
                        }}
                    >
                        <h3 style={{ marginTop: 0 }}>Panel Content</h3>
                        <p>Press Escape or click backdrop to close.</p>
                        <button onClick={() => setOpen(false)}>Close</button>
                    </div>
                </AnimatedPanel>
            </div>
        );
    },
};

export const WithBackdrop: Story = {
    render: () => {
        const [open, setOpen] = useState(false);
        return (
            <div>
                <button onClick={() => setOpen(true)}>
                    Open Panel with Backdrop
                </button>
                <AnimatedPanel
                    open={open}
                    onClose={() => setOpen(false)}
                    backdrop
                >
                    <div
                        style={{
                            padding: 24,
                            background: '#fff',
                            height: '100%',
                            boxShadow: '-2px 0 8px rgba(0,0,0,0.1)',
                        }}
                    >
                        <h3 style={{ marginTop: 0 }}>Panel with Backdrop</h3>
                        <p>Click backdrop or press Escape to close.</p>
                        <button onClick={() => setOpen(false)}>Close</button>
                    </div>
                </AnimatedPanel>
            </div>
        );
    },
};

export const CustomWidth: Story = {
    render: () => {
        const [open, setOpen] = useState(false);
        return (
            <div>
                <button onClick={() => setOpen(true)}>
                    Open Wide Panel (500px)
                </button>
                <AnimatedPanel
                    open={open}
                    onClose={() => setOpen(false)}
                    width={500}
                    backdrop
                >
                    <div
                        style={{
                            padding: 24,
                            background: '#fff',
                            height: '100%',
                            boxShadow: '-2px 0 8px rgba(0,0,0,0.1)',
                        }}
                    >
                        <h3 style={{ marginTop: 0 }}>Wide Panel (500px)</h3>
                        <button onClick={() => setOpen(false)}>Close</button>
                    </div>
                </AnimatedPanel>
            </div>
        );
    },
};
