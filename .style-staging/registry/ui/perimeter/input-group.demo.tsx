import { SearchIcon, MailIcon } from "lucide-react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "./input-group";

import type { ControlsConfig, PlaygroundProps } from "@/lib/demo-types";

export const meta = {
  name: "Input Group",
  description: "Groups an input with addons like icons, text, or buttons.",
  category: "forms",
  install: "pnpm dlx shadcn@latest add @perimeter/input-group",
};

export const controls = {
  disabled: {
    type: "boolean",
    default: false,
  },
} satisfies ControlsConfig;

export function Playground(props: PlaygroundProps<typeof controls>) {
  return (
    <InputGroup className="max-w-sm">
      <InputGroupAddon align="inline-start">
        <InputGroupText>
          <SearchIcon />
        </InputGroupText>
      </InputGroupAddon>
      <InputGroupInput placeholder="Search..." disabled={props.disabled} />
    </InputGroup>
  );
}

export const examples = [
  {
    name: "With Icon",
    render: () => (
      <InputGroup className="max-w-sm">
        <InputGroupAddon align="inline-start">
          <InputGroupText>
            <MailIcon />
          </InputGroupText>
        </InputGroupAddon>
        <InputGroupInput placeholder="Email address" />
      </InputGroup>
    ),
  },
  {
    name: "With Text Addon",
    render: () => (
      <InputGroup className="max-w-sm">
        <InputGroupAddon align="inline-start">
          <InputGroupText>https://</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput placeholder="example.com" />
      </InputGroup>
    ),
  },
  {
    name: "Disabled",
    render: () => (
      <InputGroup className="max-w-sm">
        <InputGroupAddon align="inline-start">
          <InputGroupText>
            <SearchIcon />
          </InputGroupText>
        </InputGroupAddon>
        <InputGroupInput placeholder="Disabled..." disabled />
      </InputGroup>
    ),
  },
];
