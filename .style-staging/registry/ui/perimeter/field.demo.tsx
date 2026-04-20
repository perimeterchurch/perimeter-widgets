import { Input } from "./input";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "./field";

import type { ControlsConfig, PlaygroundProps } from "@/lib/demo-types";

export const meta = {
  name: "Field",
  description:
    "Structured form field with label, description, and error message.",
  category: "forms",
  install: "pnpm dlx shadcn@latest add @perimeter/field",
};

export const controls = {
  orientation: {
    type: "enum",
    options: ["vertical", "horizontal"],
    default: "vertical",
  },
} satisfies ControlsConfig;

export function Playground(props: PlaygroundProps<typeof controls>) {
  return (
    <FieldGroup className="max-w-sm">
      <Field orientation={props.orientation as "vertical"}>
        <FieldLabel>Email</FieldLabel>
        <Input placeholder="you@example.com" />
        <FieldDescription>Your primary email address.</FieldDescription>
      </Field>
    </FieldGroup>
  );
}

export const examples = [
  {
    name: "Vertical Layout",
    render: () => (
      <FieldGroup className="max-w-sm">
        <Field orientation="vertical">
          <FieldLabel>Name</FieldLabel>
          <Input placeholder="John Doe" />
          <FieldDescription>Enter your full name.</FieldDescription>
        </Field>
      </FieldGroup>
    ),
  },
  {
    name: "With Error",
    render: () => (
      <FieldGroup className="max-w-sm">
        <Field orientation="vertical" data-invalid="true">
          <FieldLabel>Email</FieldLabel>
          <Input placeholder="you@example.com" aria-invalid="true" />
          <FieldError>Please enter a valid email address.</FieldError>
        </Field>
      </FieldGroup>
    ),
  },
  {
    name: "Horizontal Layout",
    render: () => (
      <FieldGroup className="max-w-md">
        <Field orientation="horizontal">
          <FieldLabel>Username</FieldLabel>
          <Input placeholder="johndoe" />
        </Field>
      </FieldGroup>
    ),
  },
];
