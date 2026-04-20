"use client";

import { toast } from "sonner";

import { Button } from "./button";

import type { ControlsConfig, PlaygroundProps } from "@/lib/demo-types";

export const meta = {
  name: "Sonner",
  description: "An opinionated toast component built on top of Sonner.",
  category: "feedback",
  install: "pnpm dlx shadcn@latest add @perimeter/sonner",
};

export const controls = {
  variant: {
    type: "enum",
    options: ["default", "success", "error", "warning", "info"],
    default: "default",
  },
} satisfies ControlsConfig;

export function Playground(props: PlaygroundProps<typeof controls>) {
  const showToast = () => {
    switch (props.variant) {
      case "success":
        toast.success("Success! Operation completed.");
        break;
      case "error":
        toast.error("Error! Something went wrong.");
        break;
      case "warning":
        toast.warning("Warning! Please check your input.");
        break;
      case "info":
        toast.info("Info: Here is some helpful information.");
        break;
      default:
        toast("This is a default toast message.");
    }
  };

  return <Button onClick={showToast}>Show Toast</Button>;
}

export const examples = [
  {
    name: "Success Toast",
    render: () => (
      <Button onClick={() => toast.success("Successfully saved!")}>
        Show Success
      </Button>
    ),
  },
  {
    name: "Error Toast",
    render: () => (
      <Button
        variant="destructive"
        onClick={() => toast.error("Failed to save.")}
      >
        Show Error
      </Button>
    ),
  },
  {
    name: "With Description",
    render: () => (
      <Button
        variant="outline"
        onClick={() =>
          toast("Event created", {
            description: "Monday, January 1 at 9:00 AM",
          })
        }
      >
        Show with Description
      </Button>
    ),
  },
];
