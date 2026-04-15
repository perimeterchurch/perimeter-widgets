import { Tabs, TabsList, TabsTrigger } from '@perimeter-widgets/shared';
import { BookOpen, Library } from 'lucide-react';
import type { TabId } from '../types';

const TAB_DEFS: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'sermons', label: 'Sermons', icon: <BookOpen className='h-4 w-4' /> },
    { id: 'series', label: 'Series', icon: <Library className='h-4 w-4' /> },
];

export interface SermonTabsProps {
    activeTab: string;
    onTabChange: (tab: TabId) => void;
}

export function SermonTabs({ activeTab, onTabChange }: SermonTabsProps) {
    return (
        <Tabs
            value={activeTab}
            onValueChange={(value) => onTabChange(value as TabId)}
        >
            <TabsList className='h-10'>
                {TAB_DEFS.map((tab) => (
                    <TabsTrigger
                        key={tab.id}
                        value={tab.id}
                        className='gap-1.5 px-4 text-sm'
                    >
                        {tab.icon}
                        {tab.label}
                    </TabsTrigger>
                ))}
            </TabsList>
        </Tabs>
    );
}
