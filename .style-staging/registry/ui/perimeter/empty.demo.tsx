import { InboxIcon, SearchIcon } from "lucide-react";

import { Button } from "./button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "./empty";

import type { ControlsConfig, PlaygroundProps } from "@/lib/demo-types";

export const meta = {
  name: "Empty",
  description:
    "A placeholder for empty states with icon, title, and description.",
  category: "data-display",
  install: "pnpm dlx shadcn@latest add @perimeter/empty",
};

export const controls = {
  mediaVariant: {
    type: "enum",
    options: ["default", "icon"],
    default: "icon",
  },
} satisfies ControlsConfig;

export function Playground(props: PlaygroundProps<typeof controls>) {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant={props.mediaVariant as "icon"}>
          <InboxIcon />
        </EmptyMedia>
        <EmptyTitle>No items yet</EmptyTitle>
        <EmptyDescription>
          Get started by creating your first item.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button size="sm">Create Item</Button>
      </EmptyContent>
    </Empty>
  );
}

export const examples = [
  {
    name: "Basic Empty State",
    render: () => (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <InboxIcon />
          </EmptyMedia>
          <EmptyTitle>No messages</EmptyTitle>
          <EmptyDescription>
            Your inbox is empty. New messages will appear here.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    ),
  },
  {
    name: "With Action",
    render: () => (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SearchIcon />
          </EmptyMedia>
          <EmptyTitle>No results found</EmptyTitle>
          <EmptyDescription>
            Try adjusting your search or filters.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" size="sm">
            Clear Filters
          </Button>
        </EmptyContent>
      </Empty>
    ),
  },
];
