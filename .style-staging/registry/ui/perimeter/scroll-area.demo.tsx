import { ScrollArea } from "./scroll-area";
import { Separator } from "./separator";

import type { ControlsConfig, PlaygroundProps } from "@/lib/demo-types";

export const meta = {
  name: "Scroll Area",
  description: "Augments native scroll with custom styled scrollbars.",
  category: "layout",
  install: "pnpm dlx shadcn@latest add @perimeter/scroll-area",
};

export const controls = {
  height: {
    type: "string",
    default: "200px",
  },
} satisfies ControlsConfig;

const items = Array.from({ length: 20 }, (_, i) => `Item ${i + 1}`);

export function Playground(props: PlaygroundProps<typeof controls>) {
  return (
    <ScrollArea
      className="max-w-sm rounded-md border"
      style={{ height: props.height }}
    >
      <div className="p-4">
        <h4 className="mb-2 text-sm font-medium">Scrollable List</h4>
        {items.map((item) => (
          <div key={item}>
            <div className="py-1.5 text-sm">{item}</div>
            <Separator />
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

export const examples = [
  {
    name: "Vertical Scroll",
    render: () => (
      <ScrollArea className="h-48 max-w-sm rounded-md border">
        <div className="p-4">
          {items.map((item) => (
            <div key={item} className="py-1.5 text-sm">
              {item}
            </div>
          ))}
        </div>
      </ScrollArea>
    ),
  },
  {
    name: "Horizontal Scroll",
    render: () => (
      <ScrollArea className="max-w-sm rounded-md border">
        <div className="flex gap-4 p-4">
          {items.slice(0, 10).map((item) => (
            <div
              key={item}
              className="flex h-16 w-24 shrink-0 items-center justify-center rounded-md border text-sm"
            >
              {item}
            </div>
          ))}
        </div>
      </ScrollArea>
    ),
  },
];
