import { Button } from "./button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "./drawer";

import type { ControlsConfig, PlaygroundProps } from "@/lib/demo-types";

export const meta = {
  name: "Drawer",
  description:
    "A panel that slides in from the edge of the screen, typically from the bottom on mobile.",
  category: "feedback",
  install: "pnpm dlx shadcn@latest add @perimeter/drawer",
};

export const controls = {
  direction: {
    type: "enum",
    options: ["bottom", "top", "left", "right"],
    default: "bottom",
  },
} satisfies ControlsConfig;

export function Playground(props: PlaygroundProps<typeof controls>) {
  return (
    <Drawer direction={props.direction as "bottom"}>
      <DrawerTrigger asChild>
        <Button variant="outline">Open Drawer</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Drawer Title</DrawerTitle>
          <DrawerDescription>
            This is a drawer that slides from the edge.
          </DrawerDescription>
        </DrawerHeader>
        <div className="p-4">
          <p className="text-sm text-muted-foreground">Drawer content here.</p>
        </div>
        <DrawerFooter>
          <Button>Submit</Button>
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

export const examples = [
  {
    name: "Bottom Drawer",
    render: () => (
      <Drawer>
        <DrawerTrigger asChild>
          <Button variant="outline">Bottom Drawer</Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Settings</DrawerTitle>
            <DrawerDescription>Adjust your preferences.</DrawerDescription>
          </DrawerHeader>
          <DrawerFooter>
            <Button>Save</Button>
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    ),
  },
  {
    name: "Right Drawer",
    render: () => (
      <Drawer direction="right">
        <DrawerTrigger asChild>
          <Button variant="outline">Right Drawer</Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Details</DrawerTitle>
            <DrawerDescription>View item details.</DrawerDescription>
          </DrawerHeader>
          <div className="p-4">
            <p className="text-sm text-muted-foreground">
              Content slides in from the right.
            </p>
          </div>
        </DrawerContent>
      </Drawer>
    ),
  },
];
