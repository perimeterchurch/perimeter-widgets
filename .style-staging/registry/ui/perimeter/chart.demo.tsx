"use client";

import { Bar, BarChart, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "./chart";

import type { ChartConfig } from "./chart";
import type { ControlsConfig, PlaygroundProps } from "@/lib/demo-types";

export const meta = {
  name: "Chart",
  description: "Chart container and tooltip components built on Recharts.",
  category: "data-display",
  install: "pnpm dlx shadcn@latest add @perimeter/chart",
};

export const controls = {
  showTooltip: {
    type: "boolean",
    default: true,
  },
} satisfies ControlsConfig;

const chartData = [
  { month: "Jan", value: 186 },
  { month: "Feb", value: 305 },
  { month: "Mar", value: 237 },
  { month: "Apr", value: 273 },
  { month: "May", value: 209 },
  { month: "Jun", value: 314 },
];

const chartConfig = {
  value: { label: "Value", color: "var(--primary)" },
} satisfies ChartConfig;

export function Playground(props: PlaygroundProps<typeof controls>) {
  return (
    <ChartContainer config={chartConfig} className="h-48 w-full max-w-md">
      <BarChart data={chartData}>
        <XAxis dataKey="month" />
        <YAxis />
        <Bar dataKey="value" fill="var(--color-value)" radius={4} />
        {props.showTooltip && (
          <ChartTooltip content={<ChartTooltipContent />} />
        )}
      </BarChart>
    </ChartContainer>
  );
}

export const examples = [
  {
    name: "Bar Chart",
    render: () => (
      <ChartContainer config={chartConfig} className="h-48 w-full max-w-md">
        <BarChart data={chartData}>
          <XAxis dataKey="month" />
          <YAxis />
          <Bar dataKey="value" fill="var(--color-value)" radius={4} />
          <ChartTooltip content={<ChartTooltipContent />} />
        </BarChart>
      </ChartContainer>
    ),
  },
  {
    name: "Without Tooltip",
    render: () => (
      <ChartContainer config={chartConfig} className="h-48 w-full max-w-md">
        <BarChart data={chartData}>
          <XAxis dataKey="month" />
          <Bar dataKey="value" fill="var(--color-value)" radius={4} />
        </BarChart>
      </ChartContainer>
    ),
  },
];
