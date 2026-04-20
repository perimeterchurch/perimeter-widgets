import { Calendar } from "./calendar";

import type { ControlsConfig, PlaygroundProps } from "@/lib/demo-types";

export const meta = {
  name: "Calendar",
  description: "A date picker calendar component for selecting dates.",
  category: "forms",
  install: "pnpm dlx shadcn@latest add @perimeter/calendar",
};

export const controls = {
  showOutsideDays: {
    type: "boolean",
    default: true,
  },
} satisfies ControlsConfig;

export function Playground(props: PlaygroundProps<typeof controls>) {
  return <Calendar mode="single" showOutsideDays={props.showOutsideDays} />;
}

export const examples = [
  {
    name: "Single Date",
    render: () => <Calendar mode="single" />,
  },
  {
    name: "Multiple Months",
    render: () => <Calendar mode="single" numberOfMonths={2} />,
  },
  {
    name: "With Dropdown Navigation",
    render: () => <Calendar mode="single" captionLayout="dropdown" />,
  },
];
