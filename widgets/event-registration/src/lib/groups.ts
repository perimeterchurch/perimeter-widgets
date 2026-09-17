import type { RegistrationSection } from '@perimeter/api-hooks';

export interface SectionGroup {
  /** Heading text as staff typed it (first occurrence); null for the ungrouped run. */
  label: string | null;
  sections: RegistrationSection[];
}

/**
 * Arrange sections under the headings staff set in `bp_Related_Events.Section_Group`.
 *
 * Grouping happens only when staff set it: sections with no group come first
 * with no heading (that is also where the hub's own section lands), then each
 * group in order of its lowest `position`, sections inside a group by
 * `position`. Group names are matched case-insensitively and trimmed so
 * "Kids" and "kids " share a heading. An event with no groups at all yields a
 * single unlabelled run, so the page looks exactly as it did before.
 */
export function groupSections(sections: readonly RegistrationSection[]): SectionGroup[] {
  const ordered = [...sections].sort((a, b) => a.position - b.position);
  const ungrouped: RegistrationSection[] = [];
  const groups = new Map<string, SectionGroup>();
  for (const section of ordered) {
    const label = section.sectionGroup?.trim() ?? '';
    if (label.length === 0) {
      ungrouped.push(section);
      continue;
    }
    const key = label.toLowerCase();
    const group = groups.get(key);
    if (group) group.sections.push(section);
    else groups.set(key, { label, sections: [section] });
  }
  const out: SectionGroup[] = [];
  if (ungrouped.length > 0) out.push({ label: null, sections: ungrouped });
  // Insertion order of the Map is first-occurrence order, i.e. lowest position first.
  for (const group of groups.values()) out.push(group);
  return out;
}
