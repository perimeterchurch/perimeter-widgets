import type { Meta, StoryObj } from '@storybook/react';
import { Skeleton } from './Skeleton';

const meta: Meta<typeof Skeleton> = {
    title: 'Primitives/Skeleton',
    component: Skeleton,
    argTypes: {
        variant: {
            control: 'select',
            options: ['line', 'circle', 'card'],
        },
        width: { control: 'text' },
        height: { control: 'text' },
    },
};

export default meta;
type Story = StoryObj<typeof Skeleton>;

export const Line: Story = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Skeleton width='100%' height={16} />
            <Skeleton width='80%' height={16} />
            <Skeleton width='60%' height={16} />
        </div>
    ),
};

export const Circle: Story = {
    render: () => <Skeleton variant='circle' width={48} height={48} />,
};

export const Card: Story = {
    render: () => <Skeleton variant='card' width='100%' height={128} />,
};

export const CustomSize: Story = {
    render: () => (
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <Skeleton variant='circle' width={40} height={40} />
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    flex: 1,
                }}
            >
                <Skeleton width='60%' height={14} />
                <Skeleton width='40%' height={14} />
            </div>
        </div>
    ),
};
