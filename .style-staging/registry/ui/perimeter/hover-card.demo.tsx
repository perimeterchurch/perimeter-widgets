import { CalendarDaysIcon } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./hover-card";

import type { ControlsConfig, PlaygroundProps } from "@/lib/demo-types";

export const meta = {
  name: "Hover Card",
  description:
    "A popup card that appears when hovering over an element, for previewing content.",
  category: "feedback",
  install: "pnpm dlx shadcn@latest add @perimeter/hover-card",
};

export const controls = {
  side: {
    type: "enum",
    options: ["top", "right", "bottom", "left"],
    default: "bottom",
  },
} satisfies ControlsConfig;

export function Playground(props: PlaygroundProps<typeof controls>) {
  return (
    <HoverCard>
      <HoverCardTrigger
        render={
          <a
            href="#"
            className="text-sm font-medium underline underline-offset-4"
          />
        }
      >
        @perimeterchurch
      </HoverCardTrigger>
      <HoverCardContent side={props.side as "bottom"}>
        <div className="flex gap-3">
          <Avatar>
            <AvatarImage src="https://github.com/shadcn.png" />
            <AvatarFallback>PC</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1">
            <h4 className="text-sm font-semibold">Perimeter Church</h4>
            <p className="text-xs text-muted-foreground">
              Building community through faith and connection.
            </p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarDaysIcon className="size-3" />
              <span>Joined December 2020</span>
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

export const examples = [
  {
    name: "User Preview",
    render: () => (
      <HoverCard>
        <HoverCardTrigger
          render={
            <a
              href="#"
              className="text-sm font-medium underline underline-offset-4"
            />
          }
        >
          @username
        </HoverCardTrigger>
        <HoverCardContent>
          <div className="flex gap-3">
            <Avatar>
              <AvatarFallback>JD</AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-1">
              <h4 className="text-sm font-semibold">John Doe</h4>
              <p className="text-xs text-muted-foreground">
                Software engineer building cool stuff.
              </p>
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>
    ),
  },
  {
    name: "Simple Text",
    render: () => (
      <HoverCard>
        <HoverCardTrigger
          render={
            <span className="cursor-pointer text-sm underline underline-offset-4" />
          }
        >
          Hover for details
        </HoverCardTrigger>
        <HoverCardContent>
          <p className="text-sm">Additional context about this element.</p>
        </HoverCardContent>
      </HoverCard>
    ),
  },
];
