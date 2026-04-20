import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "./combobox";

import type { ControlsConfig, PlaygroundProps } from "@/lib/demo-types";

export const meta = {
  name: "Combobox",
  description:
    "An autocomplete input with a filterable dropdown list of options.",
  category: "forms",
  install: "pnpm dlx shadcn@latest add @perimeter/combobox",
};

export const controls = {
  disabled: {
    type: "boolean",
    default: false,
  },
} satisfies ControlsConfig;

const fruits = ["Apple", "Banana", "Cherry", "Date", "Elderberry", "Fig"];

export function Playground(props: PlaygroundProps<typeof controls>) {
  return (
    <Combobox>
      <ComboboxInput placeholder="Search fruits..." disabled={props.disabled} />
      <ComboboxContent>
        <ComboboxList>
          {fruits.map((fruit) => (
            <ComboboxItem key={fruit} value={fruit}>
              {fruit}
            </ComboboxItem>
          ))}
        </ComboboxList>
        <ComboboxEmpty>No results found.</ComboboxEmpty>
      </ComboboxContent>
    </Combobox>
  );
}

export const examples = [
  {
    name: "Basic Combobox",
    render: () => (
      <Combobox>
        <ComboboxInput placeholder="Select a framework..." />
        <ComboboxContent>
          <ComboboxList>
            <ComboboxItem value="react">React</ComboboxItem>
            <ComboboxItem value="vue">Vue</ComboboxItem>
            <ComboboxItem value="svelte">Svelte</ComboboxItem>
            <ComboboxItem value="angular">Angular</ComboboxItem>
          </ComboboxList>
          <ComboboxEmpty>No results found.</ComboboxEmpty>
        </ComboboxContent>
      </Combobox>
    ),
  },
  {
    name: "With Clear Button",
    render: () => (
      <Combobox>
        <ComboboxInput placeholder="Choose a color..." showClear />
        <ComboboxContent>
          <ComboboxList>
            <ComboboxItem value="red">Red</ComboboxItem>
            <ComboboxItem value="blue">Blue</ComboboxItem>
            <ComboboxItem value="green">Green</ComboboxItem>
          </ComboboxList>
          <ComboboxEmpty>No matching colors.</ComboboxEmpty>
        </ComboboxContent>
      </Combobox>
    ),
  },
];
