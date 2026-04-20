import { BoldIcon, ItalicIcon, UnderlineIcon } from "lucide-react";

import { Toggle } from "./toggle";

import type { ControlsConfig, PlaygroundProps } from "@/lib/demo-types";

export const meta = {
  name: "Toggle",
  description: "A two-state button that can be either on or off.",
  category: "actions",
  install: "pnpm dlx shadcn@latest add @perimeter/toggle",
};

export const controls = {
  variant: {
    type: "enum",
    options: ["default", "outline"],
    default: "default",
  },
  size: {
    type: "enum",
    options: ["sm", "default", "lg"],
    default: "default",
  },
  disabled: {
    type: "boolean",
    default: false,
  },
} satisfies ControlsConfig;

export function Playground(props: PlaygroundProps<typeof controls>) {
  return (
    <Toggle
      variant={props.variant as "default"}
      size={props.size as "default"}
      disabled={props.disabled}
    >
      <BoldIcon />
    </Toggle>
  );
}

export const examples = [
  {
    name: "All Variants",
    render: () => (
      <div className="flex gap-2">
        <Toggle variant="default">
          <BoldIcon />
        </Toggle>
        <Toggle variant="outline">
          <ItalicIcon />
        </Toggle>
      </div>
    ),
  },
  {
    name: "Sizes",
    render: () => (
      <div className="flex items-center gap-2">
        <Toggle size="sm">
          <BoldIcon />
        </Toggle>
        <Toggle size="default">
          <BoldIcon />
        </Toggle>
        <Toggle size="lg">
          <BoldIcon />
        </Toggle>
      </div>
    ),
  },
  {
    name: "With Text",
    render: () => (
      <div className="flex gap-2">
        <Toggle>
          <BoldIcon /> Bold
        </Toggle>
        <Toggle>
          <ItalicIcon /> Italic
        </Toggle>
        <Toggle>
          <UnderlineIcon /> Underline
        </Toggle>
      </div>
    ),
  },
];
