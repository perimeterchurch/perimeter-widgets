import { Slider } from "./slider";

import type { ControlsConfig, PlaygroundProps } from "@/lib/demo-types";

export const meta = {
  name: "Slider",
  description:
    "An input for selecting a value from a range by dragging a thumb.",
  category: "forms",
  install: "pnpm dlx shadcn@latest add @perimeter/slider",
};

export const controls = {
  disabled: {
    type: "boolean",
    default: false,
  },
} satisfies ControlsConfig;

export function Playground(props: PlaygroundProps<typeof controls>) {
  return (
    <Slider
      defaultValue={[50]}
      max={100}
      min={0}
      disabled={props.disabled}
      className="max-w-sm"
    />
  );
}

export const examples = [
  {
    name: "Single Value",
    render: () => <Slider defaultValue={[30]} max={100} className="max-w-sm" />,
  },
  {
    name: "Range",
    render: () => (
      <Slider defaultValue={[25, 75]} max={100} className="max-w-sm" />
    ),
  },
  {
    name: "Disabled",
    render: () => (
      <Slider defaultValue={[50]} max={100} disabled className="max-w-sm" />
    ),
  },
];
