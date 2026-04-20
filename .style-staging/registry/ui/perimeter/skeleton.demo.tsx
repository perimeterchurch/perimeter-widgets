import { Skeleton } from "./skeleton";

import type { ControlsConfig, PlaygroundProps } from "@/lib/demo-types";

export const meta = {
  name: "Skeleton",
  description: "A placeholder loading animation for content that is loading.",
  category: "data-display",
  install: "pnpm dlx shadcn@latest add @perimeter/skeleton",
};

export const controls = {
  width: {
    type: "string",
    default: "100%",
  },
  height: {
    type: "string",
    default: "1rem",
  },
} satisfies ControlsConfig;

export function Playground(props: PlaygroundProps<typeof controls>) {
  return (
    <Skeleton
      className="max-w-sm"
      style={{ width: props.width, height: props.height }}
    />
  );
}

export const examples = [
  {
    name: "Card Skeleton",
    render: () => (
      <div className="flex flex-col gap-3 max-w-sm">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    ),
  },
  {
    name: "User Profile Skeleton",
    render: () => (
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-full" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    ),
  },
];
