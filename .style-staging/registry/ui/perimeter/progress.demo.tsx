import { Progress, ProgressLabel, ProgressValue } from "./progress";

import type { ControlsConfig, PlaygroundProps } from "@/lib/demo-types";

export const meta = {
  name: "Progress",
  description:
    "Displays an indicator showing the completion progress of a task.",
  category: "data-display",
  install: "pnpm dlx shadcn@latest add @perimeter/progress",
};

export const controls = {
  value: {
    type: "number",
    default: 60,
    min: 0,
    max: 100,
    step: 5,
  },
} satisfies ControlsConfig;

export function Playground(props: PlaygroundProps<typeof controls>) {
  return <Progress value={props.value} className="max-w-sm" />;
}

export const examples = [
  {
    name: "Basic Progress",
    render: () => <Progress value={45} className="max-w-sm" />,
  },
  {
    name: "With Label and Value",
    render: () => (
      <Progress value={72} className="max-w-sm">
        <ProgressLabel>Upload</ProgressLabel>
        <ProgressValue />
      </Progress>
    ),
  },
  {
    name: "Different Values",
    render: () => (
      <div className="flex flex-col gap-4 max-w-sm">
        <Progress value={25} />
        <Progress value={50} />
        <Progress value={75} />
        <Progress value={100} />
      </div>
    ),
  },
];
