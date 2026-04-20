import { FileIcon, FolderIcon, ImageIcon } from "lucide-react";

import { Badge } from "./badge";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "./item";

import type { ControlsConfig, PlaygroundProps } from "@/lib/demo-types";

export const meta = {
  name: "Item",
  description:
    "A versatile list item component with media, content, and actions slots.",
  category: "misc",
  install: "pnpm dlx shadcn@latest add @perimeter/item",
};

export const controls = {
  variant: {
    type: "enum",
    options: ["default", "outline", "muted"],
    default: "default",
  },
  size: {
    type: "enum",
    options: ["default", "sm", "xs"],
    default: "default",
  },
} satisfies ControlsConfig;

export function Playground(props: PlaygroundProps<typeof controls>) {
  return (
    <ItemGroup className="max-w-sm">
      <Item variant={props.variant as "default"} size={props.size as "default"}>
        <ItemMedia variant="icon">
          <FileIcon />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Item Title</ItemTitle>
          <ItemDescription>A description of this item.</ItemDescription>
        </ItemContent>
      </Item>
    </ItemGroup>
  );
}

export const examples = [
  {
    name: "File List",
    render: () => (
      <ItemGroup className="max-w-sm">
        <Item variant="outline">
          <ItemMedia variant="icon">
            <FolderIcon />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Documents</ItemTitle>
            <ItemDescription>12 files</ItemDescription>
          </ItemContent>
        </Item>
        <Item variant="outline">
          <ItemMedia variant="icon">
            <ImageIcon />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Photos</ItemTitle>
            <ItemDescription>48 files</ItemDescription>
          </ItemContent>
        </Item>
        <Item variant="outline">
          <ItemMedia variant="icon">
            <FileIcon />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>report.pdf</ItemTitle>
            <ItemDescription>2.4 MB</ItemDescription>
          </ItemContent>
          <Badge variant="secondary">New</Badge>
        </Item>
      </ItemGroup>
    ),
  },
  {
    name: "Compact Items",
    render: () => (
      <ItemGroup className="max-w-sm">
        <Item size="xs">
          <ItemMedia variant="icon">
            <FileIcon />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Small item</ItemTitle>
          </ItemContent>
        </Item>
        <Item size="xs">
          <ItemMedia variant="icon">
            <FolderIcon />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Another small item</ItemTitle>
          </ItemContent>
        </Item>
      </ItemGroup>
    ),
  },
  {
    name: "Muted Variant",
    render: () => (
      <ItemGroup className="max-w-sm">
        <Item variant="muted">
          <ItemContent>
            <ItemTitle>Muted item</ItemTitle>
            <ItemDescription>With a subtle background.</ItemDescription>
          </ItemContent>
        </Item>
      </ItemGroup>
    ),
  },
];
