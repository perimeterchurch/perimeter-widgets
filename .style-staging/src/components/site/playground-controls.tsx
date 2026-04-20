"use client";

import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";

import type { ControlsConfig, ControlDescriptor } from "@/lib/demo-types";

interface PlaygroundControlsProps {
  controls: ControlsConfig;
  values: Record<string, unknown>;
  onChange: (name: string, value: unknown) => void;
}

function EnumControl({
  options,
  value,
  onChange,
}: {
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex gap-0.5 rounded-md border p-0.5">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          className={
            opt === value
              ? "rounded-sm bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground"
              : "rounded-sm px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          }
          onClick={() => onChange(opt)}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function renderControl(
  name: string,
  descriptor: ControlDescriptor,
  value: unknown,
  onChange: (name: string, value: unknown) => void,
) {
  switch (descriptor.type) {
    case "enum":
      return (
        <EnumControl
          options={descriptor.options}
          value={value as string}
          onChange={(v) => onChange(name, v)}
        />
      );
    case "boolean":
      return (
        <Switch
          checked={value as boolean}
          onCheckedChange={(checked) => onChange(name, checked)}
        />
      );
    case "string":
      return (
        <Input
          value={(value as string) ?? ""}
          onChange={(e) => onChange(name, e.target.value)}
          className="h-7 max-w-48 text-xs"
        />
      );
    case "number":
      return (
        <Input
          type="number"
          value={value as number}
          min={descriptor.min}
          max={descriptor.max}
          step={descriptor.step}
          onChange={(e) => onChange(name, Number(e.target.value))}
          className="h-7 max-w-24 text-xs"
        />
      );
  }
}

export function PlaygroundControls({
  controls,
  values,
  onChange,
}: PlaygroundControlsProps) {
  return (
    <div className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2">
      {Object.entries(controls).map(([name, descriptor]) => (
        <div key={name} className="contents">
          <span className="text-sm text-muted-foreground">{name}</span>
          <div>{renderControl(name, descriptor, values[name], onChange)}</div>
        </div>
      ))}
    </div>
  );
}
