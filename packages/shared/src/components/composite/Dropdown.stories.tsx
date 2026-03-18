import type { Meta, StoryObj } from '@storybook/react';
import { Edit, Trash2, Copy, Settings, Download } from 'lucide-react';
import { Dropdown } from './Dropdown';

const meta: Meta<typeof Dropdown> = {
    title: 'Composite/Dropdown',
    component: Dropdown,
};

export default meta;
type Story = StoryObj<typeof Dropdown>;

export const Default: Story = {
    render: () => (
        <Dropdown
            trigger={
                <button className='rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm'>
                    Options
                </button>
            }
        >
            <Dropdown.Item onClick={() => console.log('Edit')}>
                Edit
            </Dropdown.Item>
            <Dropdown.Item onClick={() => console.log('Duplicate')}>
                Duplicate
            </Dropdown.Item>
            <Dropdown.Item onClick={() => console.log('Archive')}>
                Archive
            </Dropdown.Item>
        </Dropdown>
    ),
};

export const WithDestructive: Story = {
    render: () => (
        <Dropdown
            trigger={
                <button className='rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm'>
                    Actions
                </button>
            }
        >
            <Dropdown.Item onClick={() => console.log('Edit')}>
                Edit
            </Dropdown.Item>
            <Dropdown.Item onClick={() => console.log('Duplicate')}>
                Duplicate
            </Dropdown.Item>
            <Dropdown.Divider />
            <Dropdown.Item destructive onClick={() => console.log('Delete')}>
                Delete
            </Dropdown.Item>
        </Dropdown>
    ),
};

export const LeftAligned: Story = {
    render: () => (
        <div className='flex justify-end'>
            <Dropdown
                align='left'
                trigger={
                    <button className='rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm'>
                        Menu
                    </button>
                }
            >
                <Dropdown.Item>Option A</Dropdown.Item>
                <Dropdown.Item>Option B</Dropdown.Item>
                <Dropdown.Item>Option C</Dropdown.Item>
            </Dropdown>
        </div>
    ),
};

export const WithIcons: Story = {
    render: () => (
        <Dropdown
            trigger={
                <button className='rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm'>
                    <Settings className='inline h-4 w-4' />
                </button>
            }
        >
            <Dropdown.Item onClick={() => console.log('Edit')}>
                <Edit className='mr-2 h-4 w-4' />
                Edit
            </Dropdown.Item>
            <Dropdown.Item onClick={() => console.log('Copy')}>
                <Copy className='mr-2 h-4 w-4' />
                Duplicate
            </Dropdown.Item>
            <Dropdown.Item onClick={() => console.log('Download')}>
                <Download className='mr-2 h-4 w-4' />
                Download
            </Dropdown.Item>
            <Dropdown.Divider />
            <Dropdown.Item destructive onClick={() => console.log('Delete')}>
                <Trash2 className='mr-2 h-4 w-4' />
                Delete
            </Dropdown.Item>
        </Dropdown>
    ),
};
