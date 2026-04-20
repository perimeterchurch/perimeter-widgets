import {
  CalendarIcon,
  CreditCardIcon,
  SettingsIcon,
  UserIcon,
} from "lucide-react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "./command";

import type { ControlsConfig, PlaygroundProps } from "@/lib/demo-types";

export const meta = {
  name: "Command",
  description:
    "A searchable command palette for quickly finding and executing actions.",
  category: "navigation",
  install: "pnpm dlx shadcn@latest add @perimeter/command",
};

export const controls = {
  placeholder: {
    type: "string",
    default: "Type a command or search...",
  },
} satisfies ControlsConfig;

export function Playground(props: PlaygroundProps<typeof controls>) {
  return (
    <Command className="max-w-sm rounded-lg border">
      <CommandInput placeholder={props.placeholder} />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Suggestions">
          <CommandItem>
            <CalendarIcon /> Calendar
          </CommandItem>
          <CommandItem>
            <UserIcon /> Profile
          </CommandItem>
          <CommandItem>
            <CreditCardIcon /> Billing
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Settings">
          <CommandItem>
            <SettingsIcon /> Settings
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

export const examples = [
  {
    name: "Basic Command",
    render: () => (
      <Command className="max-w-sm rounded-lg border">
        <CommandInput placeholder="Search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Actions">
            <CommandItem>New File</CommandItem>
            <CommandItem>Open File</CommandItem>
            <CommandItem>Save</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    ),
  },
  {
    name: "With Icons and Groups",
    render: () => (
      <Command className="max-w-sm rounded-lg border">
        <CommandInput placeholder="What do you need?" />
        <CommandList>
          <CommandEmpty>Nothing found.</CommandEmpty>
          <CommandGroup heading="People">
            <CommandItem>
              <UserIcon /> Team Members
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Tools">
            <CommandItem>
              <SettingsIcon /> Settings
            </CommandItem>
            <CommandItem>
              <CalendarIcon /> Schedule
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    ),
  },
];
