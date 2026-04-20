import { Button } from "./button";

import type { ControlsConfig, PlaygroundProps } from "@/lib/demo-types";

export const meta = {
  name: "Button",
  description: "Displays a button or a component that looks like a button.",
  category: "actions",
  install: "pnpm dlx shadcn@latest add @perimeter/button",
};

export const controls = {
  variant: {
    type: "enum",
    options: [
      "default",
      "secondary",
      "outline",
      "ghost",
      "link",
      "destructive",
    ],
    default: "default",
  },
  size: {
    type: "enum",
    options: ["sm", "default", "lg", "icon"],
    default: "default",
  },
  children: {
    type: "string",
    default: "Click me",
  },
  disabled: {
    type: "boolean",
    default: false,
  },
} satisfies ControlsConfig;

export function Playground(props: PlaygroundProps<typeof controls>) {
  return (
    <Button
      variant={props.variant as "default"}
      size={props.size as "default"}
      disabled={props.disabled}
    >
      {props.children}
    </Button>
  );
}

export const examples = [
  {
    name: "All Variants",
    render: () => (
      <div className="flex gap-2 flex-wrap">
        <Button variant="default">Default</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="link">Link</Button>
        <Button variant="destructive">Destructive</Button>
      </div>
    ),
  },
  {
    name: "Sizes",
    render: () => (
      <div className="flex items-center gap-2">
        <Button size="sm">Small</Button>
        <Button size="default">Default</Button>
        <Button size="lg">Large</Button>
      </div>
    ),
  },
  {
    name: "Disabled",
    render: () => (
      <div className="flex gap-2">
        <Button disabled>Disabled</Button>
        <Button variant="outline" disabled>
          Disabled Outline
        </Button>
      </div>
    ),
  },
];
