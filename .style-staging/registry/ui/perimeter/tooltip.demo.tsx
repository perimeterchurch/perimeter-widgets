import { Button } from "./button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";

import type { ControlsConfig, PlaygroundProps } from "@/lib/demo-types";

export const meta = {
  name: "Tooltip",
  description:
    "A popup that displays information when hovering or focusing an element.",
  category: "feedback",
  install: "pnpm dlx shadcn@latest add @perimeter/tooltip",
};

export const controls = {
  side: {
    type: "enum",
    options: ["top", "right", "bottom", "left"],
    default: "top",
  },
} satisfies ControlsConfig;

export function Playground(props: PlaygroundProps<typeof controls>) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger render={<Button variant="outline" />}>
          Hover me
        </TooltipTrigger>
        <TooltipContent side={props.side as "top"}>
          This is a tooltip
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export const examples = [
  {
    name: "All Sides",
    render: () => (
      <TooltipProvider>
        <div className="flex gap-4">
          <Tooltip>
            <TooltipTrigger render={<Button variant="outline" size="sm" />}>
              Top
            </TooltipTrigger>
            <TooltipContent side="top">Top tooltip</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger render={<Button variant="outline" size="sm" />}>
              Right
            </TooltipTrigger>
            <TooltipContent side="right">Right tooltip</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger render={<Button variant="outline" size="sm" />}>
              Bottom
            </TooltipTrigger>
            <TooltipContent side="bottom">Bottom tooltip</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger render={<Button variant="outline" size="sm" />}>
              Left
            </TooltipTrigger>
            <TooltipContent side="left">Left tooltip</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    ),
  },
  {
    name: "Default",
    render: () => (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger render={<Button variant="outline" />}>
            Hover for info
          </TooltipTrigger>
          <TooltipContent>Helpful tooltip text</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ),
  },
];
