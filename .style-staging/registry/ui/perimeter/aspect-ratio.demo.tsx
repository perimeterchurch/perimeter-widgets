import { AspectRatio } from "./aspect-ratio";

import type { ControlsConfig, PlaygroundProps } from "@/lib/demo-types";

export const meta = {
  name: "Aspect Ratio",
  description: "Displays content within a desired ratio.",
  category: "layout",
  install: "pnpm dlx shadcn@latest add @perimeter/aspect-ratio",
};

export const controls = {
  ratio: {
    type: "number",
    default: 16 / 9,
    min: 0.5,
    max: 3,
    step: 0.1,
  },
} satisfies ControlsConfig;

export function Playground(props: PlaygroundProps<typeof controls>) {
  return (
    <div className="max-w-sm">
      <AspectRatio ratio={props.ratio} className="rounded-lg bg-muted">
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          {props.ratio.toFixed(2)} ratio
        </div>
      </AspectRatio>
    </div>
  );
}

export const examples = [
  {
    name: "16:9",
    render: () => (
      <div className="max-w-sm">
        <AspectRatio ratio={16 / 9} className="rounded-lg bg-muted">
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            16:9
          </div>
        </AspectRatio>
      </div>
    ),
  },
  {
    name: "1:1 Square",
    render: () => (
      <div className="max-w-xs">
        <AspectRatio ratio={1} className="rounded-lg bg-muted">
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            1:1
          </div>
        </AspectRatio>
      </div>
    ),
  },
  {
    name: "4:3",
    render: () => (
      <div className="max-w-sm">
        <AspectRatio ratio={4 / 3} className="rounded-lg bg-muted">
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            4:3
          </div>
        </AspectRatio>
      </div>
    ),
  },
];
