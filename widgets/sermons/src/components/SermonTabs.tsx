import { SegmentedTabs } from '@perimeter/ui/segmented-tabs';
import type { TabId } from '../types';

const TAB_DEFS: { id: TabId; label: string }[] = [
  { id: 'sermons', label: 'Sermons' },
  { id: 'series', label: 'Series' },
];

export interface SermonTabsProps {
  activeTab: string;
  onTabChange: (tab: TabId) => void;
}

/**
 * The sermons/series tab row: the shared `@perimeter/ui` SegmentedTabs in its
 * `underline` variant — bold labels over a rule with a brand-blue bar under the
 * active tab, the same control as the sermon detail's Watch / Listen / PDF.
 * The bar is a plain per-tab border, not the measured, ResizeObserver-driven
 * indicator of the old Tabs `line` variant that proved fragile across themes.
 */
export function SermonTabs({ activeTab, onTabChange }: SermonTabsProps) {
  return (
    <SegmentedTabs
      variant="underline"
      items={TAB_DEFS}
      value={activeTab}
      onChange={(id) => onTabChange(id as TabId)}
      aria-label="Sermons and series"
    />
  );
}
