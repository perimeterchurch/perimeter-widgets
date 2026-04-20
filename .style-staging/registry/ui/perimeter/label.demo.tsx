import { Input } from "./input";
import { Label } from "./label";

import type { ControlsConfig, PlaygroundProps } from "@/lib/demo-types";

export const meta = {
  name: "Label",
  description: "Renders an accessible label associated with form controls.",
  category: "forms",
  install: "pnpm dlx shadcn@latest add @perimeter/label",
};

export const controls = {
  children: {
    type: "string",
    default: "Email address",
  },
} satisfies ControlsConfig;

export function Playground(props: PlaygroundProps<typeof controls>) {
  return (
    <div className="flex flex-col gap-2 max-w-sm">
      <Label htmlFor="demo-label-input">{props.children}</Label>
      <Input id="demo-label-input" placeholder="you@example.com" />
    </div>
  );
}

export const examples = [
  {
    name: "With Input",
    render: () => (
      <div className="flex flex-col gap-2 max-w-sm">
        <Label htmlFor="ex-email">Email</Label>
        <Input id="ex-email" placeholder="you@example.com" />
      </div>
    ),
  },
  {
    name: "Disabled State",
    render: () => (
      <div className="flex flex-col gap-2 max-w-sm">
        <Label htmlFor="ex-disabled">Disabled</Label>
        <Input id="ex-disabled" placeholder="Cannot type here" disabled />
      </div>
    ),
  },
];
