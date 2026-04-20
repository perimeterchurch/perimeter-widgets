import { ChevronsUpDownIcon } from "lucide-react";

import { Button } from "./button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./collapsible";

import type { ControlsConfig, PlaygroundProps } from "@/lib/demo-types";

export const meta = {
  name: "Collapsible",
  description: "An interactive component which expands and collapses content.",
  category: "layout",
  install: "pnpm dlx shadcn@latest add @perimeter/collapsible",
};

export const controls = {
  defaultOpen: {
    type: "boolean",
    default: false,
  },
} satisfies ControlsConfig;

export function Playground(props: PlaygroundProps<typeof controls>) {
  return (
    <Collapsible defaultOpen={props.defaultOpen} className="max-w-sm">
      <div className="flex items-center justify-between gap-4">
        <h4 className="text-sm font-semibold">3 items</h4>
        <CollapsibleTrigger render={<Button variant="ghost" size="sm" />}>
          <ChevronsUpDownIcon className="size-4" />
          <span className="sr-only">Toggle</span>
        </CollapsibleTrigger>
      </div>
      <div className="rounded-md border px-4 py-2 text-sm">
        Item 1 (always visible)
      </div>
      <CollapsibleContent className="flex flex-col gap-2 pt-2">
        <div className="rounded-md border px-4 py-2 text-sm">Item 2</div>
        <div className="rounded-md border px-4 py-2 text-sm">Item 3</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export const examples = [
  {
    name: "Default Closed",
    render: () => (
      <Collapsible className="max-w-sm">
        <div className="flex items-center justify-between gap-4">
          <h4 className="text-sm font-semibold">Toggle content</h4>
          <CollapsibleTrigger render={<Button variant="ghost" size="sm" />}>
            <ChevronsUpDownIcon className="size-4" />
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="pt-2">
          <div className="rounded-md border px-4 py-2 text-sm">
            Hidden content revealed on toggle.
          </div>
        </CollapsibleContent>
      </Collapsible>
    ),
  },
  {
    name: "Default Open",
    render: () => (
      <Collapsible defaultOpen className="max-w-sm">
        <div className="flex items-center justify-between gap-4">
          <h4 className="text-sm font-semibold">Expanded by default</h4>
          <CollapsibleTrigger render={<Button variant="ghost" size="sm" />}>
            <ChevronsUpDownIcon className="size-4" />
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="pt-2">
          <div className="rounded-md border px-4 py-2 text-sm">
            This content is visible initially.
          </div>
        </CollapsibleContent>
      </Collapsible>
    ),
  },
];
