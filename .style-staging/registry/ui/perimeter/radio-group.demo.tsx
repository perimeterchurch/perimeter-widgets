import { Label } from "./label";
import { RadioGroup, RadioGroupItem } from "./radio-group";

import type { ControlsConfig, PlaygroundProps } from "@/lib/demo-types";

export const meta = {
  name: "Radio Group",
  description:
    "A set of checkable buttons where only one can be checked at a time.",
  category: "forms",
  install: "pnpm dlx shadcn@latest add @perimeter/radio-group",
};

export const controls = {
  disabled: {
    type: "boolean",
    default: false,
  },
} satisfies ControlsConfig;

export function Playground(props: PlaygroundProps<typeof controls>) {
  return (
    <RadioGroup defaultValue="option-1" disabled={props.disabled}>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="option-1" id="r1" />
        <Label htmlFor="r1">Option One</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="option-2" id="r2" />
        <Label htmlFor="r2">Option Two</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="option-3" id="r3" />
        <Label htmlFor="r3">Option Three</Label>
      </div>
    </RadioGroup>
  );
}

export const examples = [
  {
    name: "Default Selection",
    render: () => (
      <RadioGroup defaultValue="comfortable">
        <div className="flex items-center gap-2">
          <RadioGroupItem value="compact" id="r-compact" />
          <Label htmlFor="r-compact">Compact</Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="comfortable" id="r-comfortable" />
          <Label htmlFor="r-comfortable">Comfortable</Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="spacious" id="r-spacious" />
          <Label htmlFor="r-spacious">Spacious</Label>
        </div>
      </RadioGroup>
    ),
  },
  {
    name: "Disabled",
    render: () => (
      <RadioGroup defaultValue="a" disabled>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="a" id="r-dis-a" />
          <Label htmlFor="r-dis-a">Selected</Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="b" id="r-dis-b" />
          <Label htmlFor="r-dis-b">Disabled</Label>
        </div>
      </RadioGroup>
    ),
  },
];
