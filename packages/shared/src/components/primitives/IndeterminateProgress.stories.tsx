import type { Meta, StoryObj } from '@storybook/react';
import { IndeterminateProgress } from './IndeterminateProgress';

const meta: Meta<typeof IndeterminateProgress> = {
    title: 'Primitives/IndeterminateProgress',
    component: IndeterminateProgress,
    decorators: [
        (Story) => (
            <div
                style={{
                    position: 'relative',
                    minHeight: '100px',
                    border: '1px solid #e5e5e5',
                    borderRadius: '8px',
                }}
            >
                <Story />
                <div
                    style={{
                        padding: '24px',
                        textAlign: 'center',
                        color: '#999',
                    }}
                >
                    Content area (parent has position: relative)
                </div>
            </div>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof IndeterminateProgress>;

export const Default: Story = {
    args: { visible: true },
};

export const Hidden: Story = {
    args: { visible: false },
};
