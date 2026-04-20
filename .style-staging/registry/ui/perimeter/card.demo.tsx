import { Button } from "./button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";

import type { ControlsConfig, PlaygroundProps } from "@/lib/demo-types";

export const meta = {
  name: "Card",
  description: "Displays a card with header, content, and footer sections.",
  category: "data-display",
  install: "pnpm dlx shadcn@latest add @perimeter/card",
};

export const controls = {
  size: {
    type: "enum",
    options: ["default", "sm"],
    default: "default",
  },
} satisfies ControlsConfig;

export function Playground(props: PlaygroundProps<typeof controls>) {
  return (
    <Card size={props.size as "default"} className="max-w-sm">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description goes here.</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Card content with some details.</p>
      </CardContent>
      <CardFooter>
        <Button variant="outline" size="sm">
          Cancel
        </Button>
        <Button size="sm" className="ml-auto">
          Save
        </Button>
      </CardFooter>
    </Card>
  );
}

export const examples = [
  {
    name: "Default",
    render: () => (
      <Card className="max-w-sm">
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>You have 3 unread messages.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Check your inbox for the latest updates.</p>
        </CardContent>
      </Card>
    ),
  },
  {
    name: "Small Size",
    render: () => (
      <Card size="sm" className="max-w-xs">
        <CardHeader>
          <CardTitle>Compact Card</CardTitle>
          <CardDescription>Smaller padding and text.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Great for dense layouts.</p>
        </CardContent>
      </Card>
    ),
  },
  {
    name: "With Footer",
    render: () => (
      <Card className="max-w-sm">
        <CardHeader>
          <CardTitle>Confirm Action</CardTitle>
          <CardDescription>Are you sure you want to proceed?</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button variant="outline" size="sm">
            Cancel
          </Button>
          <Button size="sm" className="ml-auto">
            Confirm
          </Button>
        </CardFooter>
      </Card>
    ),
  },
];
