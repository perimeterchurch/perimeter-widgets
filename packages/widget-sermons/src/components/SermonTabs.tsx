import { Badge, Tabs } from '@perimeter-widgets/shared';
import type { TabId } from '../types';

const TABS = [
    { id: 'sermons' as const, label: 'Sermons' },
    { id: 'series' as const, label: 'Series' },
    {
        id: 'compilations' as const,
        label: 'Compilations',
        disabled: true,
        badge: (
            <Badge size='sm' variant='secondary'>
                Soon
            </Badge>
        ),
    },
];

export interface SermonTabsProps {
    activeTab: string;
    onTabChange: (tab: TabId) => void;
}

export function SermonTabs({ activeTab, onTabChange }: SermonTabsProps) {
    return (
        <Tabs
            tabs={TABS}
            activeTab={activeTab}
            onChange={(id) => onTabChange(id as TabId)}
        />
    );
}
