import { Kbd, KbdGroup } from "./kbd";

import type { ControlsConfig, PlaygroundProps } from "@/lib/demo-types";

export const meta = {
  name: "Kbd",
  description: "Displays a keyboard key or shortcut.",
  category: "misc",
  install: "pnpm dlx shadcn@latest add @perimeter/kbd",
};

export const controls = {
  children: {
    type: "string",
    default: "K",
  },
} satisfies ControlsConfig;

export function Playground(props: PlaygroundProps<typeof controls>) {
  return <Kbd>{props.children}</Kbd>;
}

export const examples = [
  {
    name: "Single Keys",
    render: () => (
      <div className="flex gap-2">
        <Kbd>Esc</Kbd>
        <Kbd>Tab</Kbd>
        <Kbd>Enter</Kbd>
        <Kbd>Space</Kbd>
      </div>
    ),
  },
  {
    name: "Keyboard Shortcut",
    render: () => (
      <KbdGroup>
        <Kbd>Ctrl</Kbd>+<Kbd>K</Kbd>
      </KbdGroup>
    ),
  },
  {
    name: "Multiple Shortcuts",
    render: () => (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground w-20">Copy</span>
          <KbdGroup>
            <Kbd>Ctrl</Kbd>+<Kbd>C</Kbd>
          </KbdGroup>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground w-20">Paste</span>
          <KbdGroup>
            <Kbd>Ctrl</Kbd>+<Kbd>V</Kbd>
          </KbdGroup>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground w-20">Undo</span>
          <KbdGroup>
            <Kbd>Ctrl</Kbd>+<Kbd>Z</Kbd>
          </KbdGroup>
        </div>
      </div>
    ),
  },
];
