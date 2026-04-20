export interface EnumControl {
  type: "enum";
  options: readonly string[];
  default: string;
}

export interface BooleanControl {
  type: "boolean";
  default: boolean;
}

export interface StringControl {
  type: "string";
  default: string;
}

export interface NumberControl {
  type: "number";
  default: number;
  min?: number;
  max?: number;
  step?: number;
}

export type ControlDescriptor =
  | EnumControl
  | BooleanControl
  | StringControl
  | NumberControl;

export type ControlsConfig = Record<string, ControlDescriptor>;

type InferControlType<T extends ControlDescriptor> = T extends EnumControl
  ? T["options"][number]
  : T extends BooleanControl
    ? boolean
    : T extends StringControl
      ? string
      : T extends NumberControl
        ? number
        : never;

export type PlaygroundProps<T extends ControlsConfig> = {
  [K in keyof T]: InferControlType<T[K]>;
};

export interface DemoMeta {
  name: string;
  description: string;
  category: string;
  install: string;
}

export interface DemoExample {
  name: string;
  render: () => React.ReactNode;
}

export interface ManifestEntry {
  slug: string;
  name: string;
  description: string;
  category: string;
  install: string;
  demoFile: string;
}

export function groupByCategory(
  entries: ManifestEntry[],
): [string, ManifestEntry[]][] {
  const groups: Record<string, ManifestEntry[]> = {};
  for (const entry of entries) {
    (groups[entry.category] ??= []).push(entry);
  }
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
}

export function capitalize(str: string): string {
  return str
    .split("-")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}
