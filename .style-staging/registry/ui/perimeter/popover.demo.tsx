import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "./popover";

import type { ControlsConfig, PlaygroundProps } from "@/lib/demo-types";

export const meta = {
  name: "Popover",
  description:
    "Displays rich content in a popup anchored to a trigger element.",
  category: "feedback",
  install: "pnpm dlx shadcn@latest add @perimeter/popover",
};

export const controls = {
  side: {
    type: "enum",
    options: ["top", "right", "bottom", "left"],
    default: "bottom",
  },
  align: {
    type: "enum",
    options: ["start", "center", "end"],
    default: "center",
  },
} satisfies ControlsConfig;

export function Playground(props: PlaygroundProps<typeof controls>) {
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" />}>
        Open Popover
      </PopoverTrigger>
      <PopoverContent
        side={props.side as "bottom"}
        align={props.align as "center"}
      >
        <PopoverHeader>
          <PopoverTitle>Dimensions</PopoverTitle>
          <PopoverDescription>Set the width and height.</PopoverDescription>
        </PopoverHeader>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="pop-width" className="w-16">
              Width
            </Label>
            <Input id="pop-width" defaultValue="100%" />
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="pop-height" className="w-16">
              Height
            </Label>
            <Input id="pop-height" defaultValue="auto" />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export const examples = [
  {
    name: "With Form",
    render: () => (
      <Popover>
        <PopoverTrigger render={<Button variant="outline" />}>
          Settings
        </PopoverTrigger>
        <PopoverContent>
          <PopoverHeader>
            <PopoverTitle>Settings</PopoverTitle>
            <PopoverDescription>Configure options.</PopoverDescription>
          </PopoverHeader>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="pop-name" className="w-16">
                Name
              </Label>
              <Input id="pop-name" placeholder="Enter name" />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    ),
  },
  {
    name: "Simple Content",
    render: () => (
      <Popover>
        <PopoverTrigger render={<Button variant="outline" />}>
          Info
        </PopoverTrigger>
        <PopoverContent>
          <p className="text-sm">This is a simple popover with text content.</p>
        </PopoverContent>
      </Popover>
    ),
  },
];
