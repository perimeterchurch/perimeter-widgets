import { AlertCircleIcon, InfoIcon, TerminalIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "./alert";

import type { ControlsConfig, PlaygroundProps } from "@/lib/demo-types";

export const meta = {
  name: "Alert",
  description: "Displays a callout for important information or feedback.",
  category: "feedback",
  install: "pnpm dlx shadcn@latest add @perimeter/alert",
};

export const controls = {
  variant: {
    type: "enum",
    options: ["default", "destructive"],
    default: "default",
  },
} satisfies ControlsConfig;

export function Playground(props: PlaygroundProps<typeof controls>) {
  return (
    <Alert variant={props.variant as "default"} className="max-w-md">
      <InfoIcon />
      <AlertTitle>Heads up!</AlertTitle>
      <AlertDescription>
        You can add components to your app using the CLI.
      </AlertDescription>
    </Alert>
  );
}

export const examples = [
  {
    name: "Default",
    render: () => (
      <Alert className="max-w-md">
        <TerminalIcon />
        <AlertTitle>Terminal</AlertTitle>
        <AlertDescription>
          Run the following command to get started.
        </AlertDescription>
      </Alert>
    ),
  },
  {
    name: "Destructive",
    render: () => (
      <Alert variant="destructive" className="max-w-md">
        <AlertCircleIcon />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Something went wrong. Please try again later.
        </AlertDescription>
      </Alert>
    ),
  },
];
