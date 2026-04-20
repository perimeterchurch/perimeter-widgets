import {
  NativeSelect,
  NativeSelectOption,
  NativeSelectOptGroup,
} from "./native-select";

import type { ControlsConfig, PlaygroundProps } from "@/lib/demo-types";

export const meta = {
  name: "Native Select",
  description: "A native HTML select element with consistent styling.",
  category: "forms",
  install: "pnpm dlx shadcn@latest add @perimeter/native-select",
};

export const controls = {
  size: {
    type: "enum",
    options: ["sm", "default"],
    default: "default",
  },
  disabled: {
    type: "boolean",
    default: false,
  },
} satisfies ControlsConfig;

export function Playground(props: PlaygroundProps<typeof controls>) {
  return (
    <NativeSelect size={props.size as "default"} disabled={props.disabled}>
      <NativeSelectOption value="">Select an option</NativeSelectOption>
      <NativeSelectOption value="one">Option One</NativeSelectOption>
      <NativeSelectOption value="two">Option Two</NativeSelectOption>
      <NativeSelectOption value="three">Option Three</NativeSelectOption>
    </NativeSelect>
  );
}

export const examples = [
  {
    name: "Basic",
    render: () => (
      <NativeSelect>
        <NativeSelectOption value="">Choose a fruit</NativeSelectOption>
        <NativeSelectOption value="apple">Apple</NativeSelectOption>
        <NativeSelectOption value="banana">Banana</NativeSelectOption>
        <NativeSelectOption value="cherry">Cherry</NativeSelectOption>
      </NativeSelect>
    ),
  },
  {
    name: "With Option Groups",
    render: () => (
      <NativeSelect>
        <NativeSelectOption value="">Select a food</NativeSelectOption>
        <NativeSelectOptGroup label="Fruits">
          <NativeSelectOption value="apple">Apple</NativeSelectOption>
          <NativeSelectOption value="banana">Banana</NativeSelectOption>
        </NativeSelectOptGroup>
        <NativeSelectOptGroup label="Vegetables">
          <NativeSelectOption value="carrot">Carrot</NativeSelectOption>
          <NativeSelectOption value="broccoli">Broccoli</NativeSelectOption>
        </NativeSelectOptGroup>
      </NativeSelect>
    ),
  },
  {
    name: "Small Size",
    render: () => (
      <NativeSelect size="sm">
        <NativeSelectOption value="a">Small A</NativeSelectOption>
        <NativeSelectOption value="b">Small B</NativeSelectOption>
        <NativeSelectOption value="c">Small C</NativeSelectOption>
      </NativeSelect>
    ),
  },
];
