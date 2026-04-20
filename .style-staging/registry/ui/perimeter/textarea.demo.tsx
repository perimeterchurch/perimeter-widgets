import { Textarea } from "./textarea";

import type { ControlsConfig, PlaygroundProps } from "@/lib/demo-types";

export const meta = {
  name: "Textarea",
  description: "Displays a multi-line text input field.",
  category: "forms",
  install: "pnpm dlx shadcn@latest add @perimeter/textarea",
};

export const controls = {
  placeholder: {
    type: "string",
    default: "Type your message...",
  },
  disabled: {
    type: "boolean",
    default: false,
  },
} satisfies ControlsConfig;

export function Playground(props: PlaygroundProps<typeof controls>) {
  return (
    <Textarea
      placeholder={props.placeholder}
      disabled={props.disabled}
      className="max-w-sm"
    />
  );
}

export const examples = [
  {
    name: "Default",
    render: () => (
      <Textarea placeholder="Write something..." className="max-w-sm" />
    ),
  },
  {
    name: "Disabled",
    render: () => (
      <Textarea placeholder="Disabled textarea" disabled className="max-w-sm" />
    ),
  },
  {
    name: "Invalid",
    render: () => (
      <Textarea
        placeholder="Invalid textarea"
        aria-invalid="true"
        className="max-w-sm"
      />
    ),
  },
];
