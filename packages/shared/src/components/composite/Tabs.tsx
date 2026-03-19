import { type ReactNode } from 'react';
import { cn } from '../utils/cn';

export interface Tab {
    id: string;
    label: string;
    disabled?: boolean;
    badge?: ReactNode;
}

export interface TabsProps {
    tabs: Tab[];
    activeTab: string;
    onChange: (tabId: string) => void;
    className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
    return (
        <div
            className={cn(
                'flex border-b border-stone-200 dark:border-stone-700',
                className,
            )}
            role='tablist'
        >
            {tabs.map((tab) => {
                const isActive = tab.id === activeTab;
                return (
                    <button
                        key={tab.id}
                        type='button'
                        role='tab'
                        aria-selected={isActive}
                        aria-disabled={tab.disabled}
                        tabIndex={isActive ? 0 : -1}
                        disabled={tab.disabled}
                        onClick={() => {
                            if (!tab.disabled) onChange(tab.id);
                        }}
                        onKeyDown={(e) => {
                            const enabledTabs = tabs.filter((t) => !t.disabled);
                            const currentIndex = enabledTabs.findIndex(
                                (t) => t.id === tab.id,
                            );
                            let nextIndex = -1;

                            if (e.key === 'ArrowRight') {
                                nextIndex =
                                    (currentIndex + 1) % enabledTabs.length;
                            } else if (e.key === 'ArrowLeft') {
                                nextIndex =
                                    (currentIndex - 1 + enabledTabs.length)
                                    % enabledTabs.length;
                            }

                            if (nextIndex >= 0 && enabledTabs[nextIndex]) {
                                e.preventDefault();
                                onChange(enabledTabs[nextIndex]!.id);
                                const tabList = e.currentTarget.parentElement;
                                const buttons =
                                    tabList?.querySelectorAll<HTMLButtonElement>(
                                        '[role="tab"]:not([disabled])',
                                    );
                                buttons?.[nextIndex]?.focus();
                            }
                        }}
                        className={cn(
                            'relative px-4 py-2.5 text-sm font-medium transition-colors',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/50',
                            isActive ?
                                'text-[var(--color-primary)]'
                            :   'text-stone-500 dark:text-stone-400',
                            !tab.disabled
                                && !isActive
                                && 'hover:text-stone-700 dark:hover:text-stone-300',
                            tab.disabled && 'opacity-50 cursor-not-allowed',
                        )}
                    >
                        <span className='flex items-center gap-2'>
                            {tab.label}
                            {tab.badge}
                        </span>
                        {isActive && (
                            <span className='absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-primary)]' />
                        )}
                    </button>
                );
            })}
        </div>
    );
}
