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
    <div className="flex flex-col gap-2">
        <div className="w-full h-4 bg-stone-200 dark:bg-stone-700 rounded animate-pulse" />
        <div className="w-4/5 h-4 bg-stone-200 dark:bg-stone-700 rounded animate-pulse" />
        <div className="w-3/5 h-4 bg-stone-200 dark:bg-stone-700 rounded animate-pulse" />
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

function ToggleDemo() {
    const [isLoading, setIsLoading] = useState(true);
    return (
        <div>
            <button
                onClick={() => setIsLoading((v) => !v)}
                className="mb-4 px-3 py-1.5 rounded bg-stone-200 dark:bg-stone-700 text-stone-900 dark:text-stone-100 hover:bg-stone-300 dark:hover:bg-stone-600"
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
}

export const Toggle: Story = {
    render: () => <ToggleDemo />,
};
