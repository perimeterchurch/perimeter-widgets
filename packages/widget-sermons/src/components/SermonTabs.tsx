import {
    Badge,
    Tabs,
    TabsList,
    TabsTrigger,
} from '@perimeter-widgets/shared';
import type { TabId } from '../types';

const TAB_DEFS: { id: TabId; label: string; disabled?: boolean }[] = [
    { id: 'sermons', label: 'Sermons' },
    { id: 'series', label: 'Series' },
    { id: 'compilations', label: 'Compilations', disabled: true },
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
                    <TabsTrigger
                        key={tab.id}
                        value={tab.id}
                        disabled={tab.disabled}
                    >
                        {tab.label}
                        {tab.id === 'compilations' && (
                            <Badge variant='secondary' className='ml-1'>
                                Soon
                            </Badge>
                        )}
                    </TabsTrigger>
                ))}
            </TabsList>
        </Tabs>
    );
}
