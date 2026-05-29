export interface ComponentEntry {
  slug: string;
  title: string;
  importPath: string;
}
export const componentEntries: ComponentEntry[] = [
  { slug: 'button', title: 'Button', importPath: '@perimeter/ui/button' },
  { slug: 'card', title: 'Card', importPath: '@perimeter/ui/card' },
  { slug: 'input', title: 'Input', importPath: '@perimeter/ui/input' },
  { slug: 'label', title: 'Label', importPath: '@perimeter/ui/label' },
  { slug: 'skeleton', title: 'Skeleton', importPath: '@perimeter/ui/skeleton' },
];
