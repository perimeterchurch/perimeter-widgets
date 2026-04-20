import { Label } from "./label";
import { Switch } from "./switch";

import type { ControlsConfig, PlaygroundProps } from "@/lib/demo-types";

export const meta = {
  name: "Switch",
  description: "A toggle control that switches between on and off states.",
  category: "forms",
  install: "pnpm dlx shadcn@latest add @perimeter/switch",
};

export const controls = {
  size: {
    type: "enum",
    options: ["sm", "default"],
    default: "default",
  },
  disabled: {
    type: "boolean",
    default: false,
  },
} satisfies ControlsConfig;

export function Playground(props: PlaygroundProps<typeof controls>) {
  return (
    <div className="flex items-center gap-2">
      <Switch
        id="demo-switch"
        size={props.size as "default"}
        disabled={props.disabled}
      />
      <Label htmlFor="demo-switch">Toggle me</Label>
    </div>
  );
}

export const examples = [
  {
    name: "Default",
    render: () => (
      <div className="flex items-center gap-2">
        <Switch id="sw-default" />
        <Label htmlFor="sw-default">Notifications</Label>
      </div>
    ),
  },
  {
    name: "Small Size",
    render: () => (
      <div className="flex items-center gap-2">
        <Switch id="sw-small" size="sm" />
        <Label htmlFor="sw-small">Compact switch</Label>
      </div>
    ),
  },
  {
    name: "Disabled",
    render: () => (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Switch id="sw-dis-off" disabled />
          <Label htmlFor="sw-dis-off">Disabled off</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="sw-dis-on" disabled defaultChecked />
          <Label htmlFor="sw-dis-on">Disabled on</Label>
        </div>
      </div>
    ),
  },
];
