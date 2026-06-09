import { SegmentedTabs } from '@perimeter/ui/segmented-tabs';
import { BookOpen, Library } from 'lucide-react';
import type { TabId } from '../types';

const TAB_DEFS: { id: TabId; label: React.ReactNode }[] = [
  {
    id: 'sermons',
    label: (
      <>
        <BookOpen className="h-4 w-4" />
        Sermons
      </>
    ),
  },
  {
    id: 'series',
    label: (
      <>
        <Library className="h-4 w-4" />
        Series
      </>
    ),
  },
];

export interface SermonTabsProps {
  activeTab: string;
  onTabChange: (tab: TabId) => void;
}

/**
 * The sermons/series tab row. Uses the shared `@perimeter/ui` SegmentedTabs
 * control (rounded `bg-muted` track, lifted active segment that reads clearly
 * in both light and dark) — the same control as the studio inspector. This
 * replaces the `@perimeter/ui` Tabs `line` variant, whose underline indicator
 * was visually fragile across themes.
 */
export function SermonTabs({ activeTab, onTabChange }: SermonTabsProps) {
  return (
    <SegmentedTabs
      items={TAB_DEFS}
      value={activeTab}
      onChange={(id) => onTabChange(id as TabId)}
      aria-label="Sermons and series"
    />
  );
}
