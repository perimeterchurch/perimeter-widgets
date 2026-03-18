import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { SkeletonTransition } from './SkeletonTransition';

const meta: Meta<typeof SkeletonTransition> = {
    title: 'Motion/SkeletonTransition',
    component: SkeletonTransition,
    argTypes: {
        isLoading: { control: 'boolean' },
    },
};

export default meta;
type Story = StoryObj<typeof SkeletonTransition>;

const SkeletonPlaceholder = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div
            style={{
                width: '100%',
                height: 16,
                background: '#e5e7eb',
                borderRadius: 4,
                animation: 'pulse 1.5s ease-in-out infinite',
            }}
        />
        <div
            style={{
                width: '80%',
                height: 16,
                background: '#e5e7eb',
                borderRadius: 4,
                animation: 'pulse 1.5s ease-in-out infinite',
            }}
        />
        <div
            style={{
                width: '60%',
                height: 16,
                background: '#e5e7eb',
                borderRadius: 4,
                animation: 'pulse 1.5s ease-in-out infinite',
            }}
        />
    </div>
);

const LoadedContent = () => (
    <div>
        <h3 style={{ marginTop: 0 }}>Loaded Content</h3>
        <p>This is the actual content that replaced the skeleton.</p>
    </div>
);

export const Loading: Story = {
    args: {
        isLoading: true,
        skeleton: <SkeletonPlaceholder />,
        children: <LoadedContent />,
    },
};

export const Loaded: Story = {
    args: {
        isLoading: false,
        skeleton: <SkeletonPlaceholder />,
        children: <LoadedContent />,
    },
};

export const Toggle: Story = {
    render: () => {
        const [isLoading, setIsLoading] = useState(true);
        return (
            <div>
                <button
                    onClick={() => setIsLoading((v) => !v)}
                    style={{ marginBottom: 16 }}
                >
                    {isLoading ? 'Show Content' : 'Show Skeleton'}
                </button>
                <SkeletonTransition
                    isLoading={isLoading}
                    skeleton={<SkeletonPlaceholder />}
                >
                    <LoadedContent />
                </SkeletonTransition>
            </div>
        );
    },
};
