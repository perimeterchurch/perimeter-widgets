import { Tabs, TabsList, TabsTrigger } from '@perimeter-widgets/shared';
import type { TabId } from '../types';

const TAB_DEFS: { id: TabId; label: string }[] = [
    { id: 'sermons', label: 'Sermons' },
    { id: 'series', label: 'Series' },
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
            <TabsList>
                {TAB_DEFS.map((tab) => (
                    <TabsTrigger key={tab.id} value={tab.id}>
                        {tab.label}
                    </TabsTrigger>
                ))}
            </TabsList>
        </Tabs>
    );
}
