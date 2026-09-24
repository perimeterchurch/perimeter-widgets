import { SegmentedTabs } from '@perimeter/ui/segmented-tabs';
import type { TabId } from '../types';

// Heading-sized serif labels: the tab row reads as the page's H2s. Pair
// font-serif with font-normal (production Freight has no bold cut).
const label = (text: string) => (
  <span className="font-serif text-[36px] leading-tight font-normal">{text}</span>
);

// Series first (and the default tab, see SermonsConfigSchema.defaultTab).
const TAB_DEFS: { id: TabId; label: React.ReactNode }[] = [
  { id: 'series', label: label('Series') },
  { id: 'sermons', label: label('Sermons') },
];

export interface SermonTabsProps {
  activeTab: string;
  onTabChange: (tab: TabId) => void;
}

/**
 * The series/sermons tab row: the shared `@perimeter/ui` SegmentedTabs in its
 * `underline` variant — heading-sized labels over a rule with a brand-blue bar
 * under the active tab, the same control as the sermon detail's Watch / Listen
 * / PDF. The bar is a plain per-tab border, not the measured,
 * ResizeObserver-driven indicator of the old Tabs `line` variant that proved
 * fragile across themes.
 */
export function SermonTabs({ activeTab, onTabChange }: SermonTabsProps) {
  return (
    <SegmentedTabs
      variant="underline"
      className="gap-8"
      items={TAB_DEFS}
      value={activeTab}
      onChange={(id) => onTabChange(id as TabId)}
      aria-label="Series and sermons"
    />
  );
}
