import type { Meta, StoryObj } from '@storybook/react';
import { EmptyState } from './EmptyState';

const meta: Meta<typeof EmptyState> = {
    title: 'Primitives/EmptyState',
    component: EmptyState,
};

export default meta;
type Story = StoryObj<typeof EmptyState>;

export const Default: Story = {
    args: { title: 'No results found' },
};

export const WithDescription: Story = {
    args: {
        title: 'No messages',
        description: "You don't have any messages yet. Start a conversation!",
    },
};

export const WithAction: Story = {
    args: {
        title: 'No items',
        description: 'Get started by creating your first item.',
        action: (
            <button
                style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--color-primary)',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                }}
            >
                Create Item
            </button>
        ),
    },
};

export const WithIcon: Story = {
    args: {
        icon: (
            <svg
                width='48'
                height='48'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='1.5'
                strokeLinecap='round'
                strokeLinejoin='round'
            >
                <rect x='3' y='3' width='18' height='18' rx='2' ry='2' />
                <line x1='9' y1='3' x2='9' y2='21' />
            </svg>
        ),
        title: 'No data available',
        description: 'There is nothing to display at this time.',
    },
};
