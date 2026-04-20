import {
  AlignLeftIcon,
  AlignCenterIcon,
  AlignRightIcon,
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
} from "lucide-react";

import { ToggleGroup, ToggleGroupItem } from "./toggle-group";

import type { ControlsConfig, PlaygroundProps } from "@/lib/demo-types";

export const meta = {
  name: "Toggle Group",
  description: "A set of two-state buttons that can be toggled on or off.",
  category: "actions",
  install: "pnpm dlx shadcn@latest add @perimeter/toggle-group",
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
} satisfies ControlsConfig;

export function Playground(props: PlaygroundProps<typeof controls>) {
  return (
    <ToggleGroup
      variant={props.variant as "default"}
      size={props.size as "default"}
    >
      <ToggleGroupItem value="left">
        <AlignLeftIcon />
      </ToggleGroupItem>
      <ToggleGroupItem value="center">
        <AlignCenterIcon />
      </ToggleGroupItem>
      <ToggleGroupItem value="right">
        <AlignRightIcon />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

export const examples = [
  {
    name: "Single Selection",
    render: () => (
      <ToggleGroup defaultValue={["center"]}>
        <ToggleGroupItem value="left">
          <AlignLeftIcon />
        </ToggleGroupItem>
        <ToggleGroupItem value="center">
          <AlignCenterIcon />
        </ToggleGroupItem>
        <ToggleGroupItem value="right">
          <AlignRightIcon />
        </ToggleGroupItem>
      </ToggleGroup>
    ),
  },
  {
    name: "Outline Variant",
    render: () => (
      <ToggleGroup variant="outline">
        <ToggleGroupItem value="bold">
          <BoldIcon />
        </ToggleGroupItem>
        <ToggleGroupItem value="italic">
          <ItalicIcon />
        </ToggleGroupItem>
        <ToggleGroupItem value="underline">
          <UnderlineIcon />
        </ToggleGroupItem>
      </ToggleGroup>
    ),
  },
  {
    name: "Vertical",
    render: () => (
      <ToggleGroup orientation="vertical" variant="outline">
        <ToggleGroupItem value="left">
          <AlignLeftIcon />
        </ToggleGroupItem>
        <ToggleGroupItem value="center">
          <AlignCenterIcon />
        </ToggleGroupItem>
        <ToggleGroupItem value="right">
          <AlignRightIcon />
        </ToggleGroupItem>
      </ToggleGroup>
    ),
  },
];
