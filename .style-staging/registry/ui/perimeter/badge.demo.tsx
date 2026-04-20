import { Badge } from "./badge";

import type { ControlsConfig, PlaygroundProps } from "@/lib/demo-types";

export const meta = {
  name: "Badge",
  description: "Displays a small status indicator or label.",
  category: "data-display",
  install: "pnpm dlx shadcn@latest add @perimeter/badge",
};

export const controls = {
  variant: {
    type: "enum",
    options: [
      "default",
      "secondary",
      "destructive",
      "outline",
      "ghost",
      "link",
    ],
    default: "default",
  },
  children: {
    type: "string",
    default: "Badge",
  },
} satisfies ControlsConfig;

export function Playground(props: PlaygroundProps<typeof controls>) {
  return <Badge variant={props.variant as "default"}>{props.children}</Badge>;
}

export const examples = [
  {
    name: "All Variants",
    render: () => (
      <div className="flex flex-wrap gap-2">
        <Badge variant="default">Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="destructive">Destructive</Badge>
        <Badge variant="outline">Outline</Badge>
        <Badge variant="ghost">Ghost</Badge>
        <Badge variant="link">Link</Badge>
      </div>
    ),
  },
  {
    name: "Status Indicators",
    render: () => (
      <div className="flex gap-2">
        <Badge variant="default">Active</Badge>
        <Badge variant="secondary">Pending</Badge>
        <Badge variant="destructive">Error</Badge>
        <Badge variant="outline">Draft</Badge>
      </div>
    ),
  },
];
