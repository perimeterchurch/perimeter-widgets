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
            <div
                style={{
                    padding: 24,
                    background: '#fff0f0',
                    borderRadius: 8,
                }}
            >
                Scaled in content
            </div>
        ),
    },
};

export const WithDelay: Story = {
    args: {
        delay: 0.3,
        children: (
            <div
                style={{
                    padding: 24,
                    background: '#fff0f0',
                    borderRadius: 8,
                }}
            >
                Delayed scale in (0.3s)
            </div>
        ),
    },
};

export const Replay: Story = {
    render: () => {
        const [key, setKey] = useState(0);
        return (
            <div>
                <button
                    onClick={() => setKey((k) => k + 1)}
                    style={{ marginBottom: 16 }}
                >
                    Replay
                </button>
                <ScaleIn key={key}>
                    <div
                        style={{
                            padding: 24,
                            background: '#fff0f0',
                            borderRadius: 8,
                        }}
                    >
                        Click Replay to remount
                    </div>
                </ScaleIn>
            </div>
        );
    },
};
