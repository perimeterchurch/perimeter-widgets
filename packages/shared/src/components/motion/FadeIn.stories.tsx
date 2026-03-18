import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { FadeIn } from './FadeIn';

const meta: Meta<typeof FadeIn> = {
    title: 'Motion/FadeIn',
    component: FadeIn,
    argTypes: {
        delay: { control: { type: 'number', min: 0, max: 2, step: 0.1 } },
    },
};

export default meta;
type Story = StoryObj<typeof FadeIn>;

export const Default: Story = {
    args: {
        children: (
            <div
                style={{
                    padding: 24,
                    background: '#f0f4ff',
                    borderRadius: 8,
                }}
            >
                Faded in content
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
                    background: '#f0f4ff',
                    borderRadius: 8,
                }}
            >
                Delayed fade in (0.3s)
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
                <FadeIn key={key}>
                    <div
                        style={{
                            padding: 24,
                            background: '#f0f4ff',
                            borderRadius: 8,
                        }}
                    >
                        Click Replay to remount
                    </div>
                </FadeIn>
            </div>
        );
    },
};
