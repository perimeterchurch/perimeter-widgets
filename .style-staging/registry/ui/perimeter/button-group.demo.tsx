import { Button } from "./button";
import {
  ButtonGroup,
  ButtonGroupSeparator,
  ButtonGroupText,
} from "./button-group";

import type { ControlsConfig, PlaygroundProps } from "@/lib/demo-types";

export const meta = {
  name: "Button Group",
  description:
    "Groups related buttons together with shared borders and separators.",
  category: "actions",
  install: "pnpm dlx shadcn@latest add @perimeter/button-group",
};

export const controls = {
  orientation: {
    type: "enum",
    options: ["horizontal", "vertical"],
    default: "horizontal",
  },
} satisfies ControlsConfig;

export function Playground(props: PlaygroundProps<typeof controls>) {
  return (
    <ButtonGroup orientation={props.orientation as "horizontal"}>
      <Button variant="outline">Left</Button>
      <Button variant="outline">Center</Button>
      <Button variant="outline">Right</Button>
    </ButtonGroup>
  );
}

export const examples = [
  {
    name: "Horizontal Group",
    render: () => (
      <ButtonGroup orientation="horizontal">
        <Button variant="outline">Copy</Button>
        <Button variant="outline">Paste</Button>
        <Button variant="outline">Cut</Button>
      </ButtonGroup>
    ),
  },
  {
    name: "Vertical Group",
    render: () => (
      <ButtonGroup orientation="vertical">
        <Button variant="outline">Top</Button>
        <Button variant="outline">Middle</Button>
        <Button variant="outline">Bottom</Button>
      </ButtonGroup>
    ),
  },
  {
    name: "With Separator and Text",
    render: () => (
      <ButtonGroup orientation="horizontal">
        <Button variant="outline">Save</Button>
        <ButtonGroupSeparator />
        <ButtonGroupText>or</ButtonGroupText>
        <ButtonGroupSeparator />
        <Button variant="outline">Discard</Button>
      </ButtonGroup>
    ),
  },
];
