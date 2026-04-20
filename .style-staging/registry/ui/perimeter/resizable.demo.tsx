import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "./resizable";

import type { ControlsConfig, PlaygroundProps } from "@/lib/demo-types";

export const meta = {
  name: "Resizable",
  description: "Resizable panel groups for building flexible layouts.",
  category: "layout",
  install: "pnpm dlx shadcn@latest add @perimeter/resizable",
};

export const controls = {
  orientation: {
    type: "enum",
    options: ["horizontal", "vertical"],
    default: "horizontal",
  },
  withHandle: {
    type: "boolean",
    default: true,
  },
} satisfies ControlsConfig;

export function Playground(props: PlaygroundProps<typeof controls>) {
  return (
    <ResizablePanelGroup
      orientation={props.orientation as "horizontal"}
      className="max-w-md rounded-lg border"
    >
      <ResizablePanel defaultSize={50}>
        <div className="flex h-32 items-center justify-center p-4">
          <span className="text-sm font-semibold">Panel 1</span>
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle={props.withHandle} />
      <ResizablePanel defaultSize={50}>
        <div className="flex h-32 items-center justify-center p-4">
          <span className="text-sm font-semibold">Panel 2</span>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

export const examples = [
  {
    name: "Two Panels",
    render: () => (
      <ResizablePanelGroup
        orientation="horizontal"
        className="max-w-md rounded-lg border"
      >
        <ResizablePanel defaultSize={50}>
          <div className="flex h-32 items-center justify-center p-4">
            <span className="text-sm">Left</span>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={50}>
          <div className="flex h-32 items-center justify-center p-4">
            <span className="text-sm">Right</span>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    ),
  },
  {
    name: "Three Panels",
    render: () => (
      <ResizablePanelGroup
        orientation="horizontal"
        className="max-w-md rounded-lg border"
      >
        <ResizablePanel defaultSize={30}>
          <div className="flex h-32 items-center justify-center p-4">
            <span className="text-sm">Sidebar</span>
          </div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={40}>
          <div className="flex h-32 items-center justify-center p-4">
            <span className="text-sm">Content</span>
          </div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={30}>
          <div className="flex h-32 items-center justify-center p-4">
            <span className="text-sm">Panel</span>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    ),
  },
];
