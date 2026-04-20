import { Checkbox } from "./checkbox";
import { Label } from "./label";

import type { ControlsConfig, PlaygroundProps } from "@/lib/demo-types";

export const meta = {
  name: "Checkbox",
  description:
    "A control that allows the user to toggle between checked and unchecked states.",
  category: "forms",
  install: "pnpm dlx shadcn@latest add @perimeter/checkbox",
};

export const controls = {
  disabled: {
    type: "boolean",
    default: false,
  },
} satisfies ControlsConfig;

export function Playground(props: PlaygroundProps<typeof controls>) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox id="demo-check" disabled={props.disabled} />
      <Label htmlFor="demo-check">Accept terms</Label>
    </div>
  );
}

export const examples = [
  {
    name: "Default",
    render: () => (
      <div className="flex items-center gap-2">
        <Checkbox id="check-default" />
        <Label htmlFor="check-default">Remember me</Label>
      </div>
    ),
  },
  {
    name: "Checked",
    render: () => (
      <div className="flex items-center gap-2">
        <Checkbox id="check-on" defaultChecked />
        <Label htmlFor="check-on">Checked by default</Label>
      </div>
    ),
  },
  {
    name: "Disabled",
    render: () => (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Checkbox id="check-dis-off" disabled />
          <Label htmlFor="check-dis-off">Disabled unchecked</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="check-dis-on" disabled defaultChecked />
          <Label htmlFor="check-dis-on">Disabled checked</Label>
        </div>
      </div>
    ),
  },
];
