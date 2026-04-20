import { Button } from "./button";
import { DirectionProvider } from "./direction";

import type { ControlsConfig, PlaygroundProps } from "@/lib/demo-types";

export const meta = {
  name: "Direction",
  description: "Provides RTL/LTR direction context to child components.",
  category: "layout",
  install: "pnpm dlx shadcn@latest add @perimeter/direction",
};

export const controls = {
  direction: {
    type: "enum",
    options: ["ltr", "rtl"],
    default: "ltr",
  },
} satisfies ControlsConfig;

export function Playground(props: PlaygroundProps<typeof controls>) {
  return (
    <DirectionProvider direction={props.direction as "ltr"}>
      <div dir={props.direction} className="flex gap-2 rounded-lg border p-4">
        <Button variant="outline">First</Button>
        <Button variant="outline">Second</Button>
        <Button variant="outline">Third</Button>
      </div>
    </DirectionProvider>
  );
}

export const examples = [
  {
    name: "LTR Layout",
    render: () => (
      <DirectionProvider direction="ltr">
        <div dir="ltr" className="flex gap-2 rounded-lg border p-4">
          <Button variant="outline">Start</Button>
          <Button>End</Button>
        </div>
      </DirectionProvider>
    ),
  },
  {
    name: "RTL Layout",
    render: () => (
      <DirectionProvider direction="rtl">
        <div dir="rtl" className="flex gap-2 rounded-lg border p-4">
          <Button variant="outline">Start</Button>
          <Button>End</Button>
        </div>
      </DirectionProvider>
    ),
  },
];
