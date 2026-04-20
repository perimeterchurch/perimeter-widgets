import { Separator } from "./separator";

import type { ControlsConfig, PlaygroundProps } from "@/lib/demo-types";

export const meta = {
  name: "Separator",
  description: "Visually or semantically separates content.",
  category: "layout",
  install: "pnpm dlx shadcn@latest add @perimeter/separator",
};

export const controls = {
  orientation: {
    type: "enum",
    options: ["horizontal", "vertical"],
    default: "horizontal",
  },
} satisfies ControlsConfig;

export function Playground(props: PlaygroundProps<typeof controls>) {
  if (props.orientation === "vertical") {
    return (
      <div className="flex h-8 items-center gap-4">
        <span className="text-sm">Left</span>
        <Separator orientation="vertical" />
        <span className="text-sm">Right</span>
      </div>
    );
  }

  return (
    <div className="max-w-sm">
      <p className="text-sm">Above the separator</p>
      <Separator className="my-3" />
      <p className="text-sm">Below the separator</p>
    </div>
  );
}

export const examples = [
  {
    name: "Horizontal",
    render: () => (
      <div className="max-w-sm">
        <h4 className="text-sm font-medium">Section Title</h4>
        <Separator className="my-3" />
        <p className="text-sm text-muted-foreground">Section content below.</p>
      </div>
    ),
  },
  {
    name: "Vertical",
    render: () => (
      <div className="flex h-5 items-center gap-4 text-sm">
        <span>Blog</span>
        <Separator orientation="vertical" />
        <span>Docs</span>
        <Separator orientation="vertical" />
        <span>Source</span>
      </div>
    ),
  },
];
