import type { Meta, StoryObj } from '@storybook/react';
import { Avatar } from './Avatar';

const meta: Meta<typeof Avatar> = {
    title: 'Primitives/Avatar',
    component: Avatar,
    argTypes: {
        size: {
            control: 'select',
            options: ['xs', 'sm', 'md', 'lg', 'xl'],
        },
    },
};

export default meta;
type Story = StoryObj<typeof Avatar>;

export const WithImage: Story = {
    args: {
        src: 'https://i.pravatar.cc/150?u=avatar',
        alt: 'John Doe',
        fallback: 'JD',
    },
};

export const WithFallback: Story = {
    args: { fallback: 'AB' },
};

export const AllSizes: Story = {
    render: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Avatar size='xs' fallback='XS' />
            <Avatar size='sm' fallback='SM' />
            <Avatar size='md' fallback='MD' />
            <Avatar size='lg' fallback='LG' />
            <Avatar size='xl' fallback='XL' />
        </div>
    ),
};

export const BrokenImage: Story = {
    args: {
        src: 'https://broken-url.invalid/avatar.jpg',
        alt: 'Broken Image',
        fallback: 'BI',
    },
};
