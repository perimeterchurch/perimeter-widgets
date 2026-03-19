import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Tabs, type Tab } from './Tabs';

const meta: Meta<typeof Tabs> = {
    title: 'Composite/Tabs',
    component: Tabs,
};

export default meta;
type Story = StoryObj<typeof Tabs>;

const sermonTabs: Tab[] = [
    { id: 'sermons', label: 'Sermons' },
    { id: 'series', label: 'Series' },
    { id: 'compilations', label: 'Compilations', disabled: true },
];

export const Default: Story = {
    render: () => {
        const Wrapper = () => {
            const [activeTab, setActiveTab] = useState('sermons');
            return (
                <div className='w-full max-w-md'>
                    <Tabs
                        tabs={sermonTabs}
                        activeTab={activeTab}
                        onChange={setActiveTab}
                    />
                    <div className='mt-4 text-sm text-stone-600'>
                        Active tab: {activeTab}
                    </div>
                </div>
            );
        };
        return <Wrapper />;
    },
};

export const WithBadge: Story = {
    render: () => {
        const Wrapper = () => {
            const [activeTab, setActiveTab] = useState('sermons');
            const tabsWithBadge: Tab[] = [
                {
                    id: 'sermons',
                    label: 'Sermons',
                    badge: (
                        <span className='rounded-full bg-stone-200 px-1.5 py-0.5 text-xs font-semibold text-stone-600'>
                            42
                        </span>
                    ),
                },
                {
                    id: 'series',
                    label: 'Series',
                    badge: (
                        <span className='rounded-full bg-stone-200 px-1.5 py-0.5 text-xs font-semibold text-stone-600'>
                            8
                        </span>
                    ),
                },
                { id: 'compilations', label: 'Compilations', disabled: true },
            ];
            return (
                <div className='w-full max-w-md'>
                    <Tabs
                        tabs={tabsWithBadge}
                        activeTab={activeTab}
                        onChange={setActiveTab}
                    />
                    <div className='mt-4 text-sm text-stone-600'>
                        Active tab: {activeTab}
                    </div>
                </div>
            );
        };
        return <Wrapper />;
    },
};
