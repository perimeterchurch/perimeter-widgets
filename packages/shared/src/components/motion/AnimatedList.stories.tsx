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

const items = ['First item', 'Second item', 'Third item', 'Fourth item', 'Fifth item'];

export const Default: Story = {
    args: {
        children: items.map((item) => (
            <div
                key={item}
                style={{
                    padding: '12px 16px',
                    background: '#f0f4ff',
                    borderRadius: 6,
                    marginBottom: 8,
                }}
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
                style={{
                    padding: '12px 16px',
                    background: '#f0fff4',
                    borderRadius: 6,
                    marginBottom: 8,
                }}
            >
                {item}
            </div>
        )),
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
                <AnimatedList key={key}>
                    {items.map((item) => (
                        <div
                            key={item}
                            style={{
                                padding: '12px 16px',
                                background: '#f0f4ff',
                                borderRadius: 6,
                                marginBottom: 8,
                            }}
                        >
                            {item}
                        </div>
                    ))}
                </AnimatedList>
            </div>
        );
    },
};
