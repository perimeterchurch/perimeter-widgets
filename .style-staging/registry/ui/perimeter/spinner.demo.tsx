import { Spinner } from "./spinner";

import type { ControlsConfig, PlaygroundProps } from "@/lib/demo-types";

export const meta = {
  name: "Spinner",
  description: "A loading spinner indicator.",
  category: "misc",
  install: "pnpm dlx shadcn@latest add @perimeter/spinner",
};

export const controls = {
  size: {
    type: "string",
    default: "size-4",
  },
} satisfies ControlsConfig;

export function Playground(props: PlaygroundProps<typeof controls>) {
  return <Spinner className={props.size} />;
}

export const examples = [
  {
    name: "Sizes",
    render: () => (
      <div className="flex items-center gap-4">
        <Spinner className="size-3" />
        <Spinner className="size-4" />
        <Spinner className="size-6" />
        <Spinner className="size-8" />
      </div>
    ),
  },
  {
    name: "With Text",
    render: () => (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner /> Loading...
      </div>
    ),
  },
];
