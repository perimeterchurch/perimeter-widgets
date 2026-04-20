import { Input } from "./input";

import type { ControlsConfig, PlaygroundProps } from "@/lib/demo-types";

export const meta = {
  name: "Input",
  description: "Displays a form input field for text entry.",
  category: "forms",
  install: "pnpm dlx shadcn@latest add @perimeter/input",
};

export const controls = {
  type: {
    type: "enum",
    options: ["text", "email", "password", "number", "search"],
    default: "text",
  },
  placeholder: {
    type: "string",
    default: "Enter text...",
  },
  disabled: {
    type: "boolean",
    default: false,
  },
} satisfies ControlsConfig;

export function Playground(props: PlaygroundProps<typeof controls>) {
  return (
    <Input
      type={props.type}
      placeholder={props.placeholder}
      disabled={props.disabled}
    />
  );
}

export const examples = [
  {
    name: "Input Types",
    render: () => (
      <div className="flex flex-col gap-3 max-w-sm">
        <Input type="text" placeholder="Text input" />
        <Input type="email" placeholder="Email input" />
        <Input type="password" placeholder="Password input" />
        <Input type="number" placeholder="Number input" />
      </div>
    ),
  },
  {
    name: "States",
    render: () => (
      <div className="flex flex-col gap-3 max-w-sm">
        <Input placeholder="Default" />
        <Input placeholder="Disabled" disabled />
        <Input placeholder="Invalid" aria-invalid="true" />
      </div>
    ),
  },
  {
    name: "File Input",
    render: () => <Input type="file" className="max-w-sm" />,
  },
];
