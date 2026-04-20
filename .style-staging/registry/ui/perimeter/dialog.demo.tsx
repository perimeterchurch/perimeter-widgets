import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";

import type { ControlsConfig, PlaygroundProps } from "@/lib/demo-types";

export const meta = {
  name: "Dialog",
  description:
    "A modal window that overlays the main content for focused interaction.",
  category: "feedback",
  install: "pnpm dlx shadcn@latest add @perimeter/dialog",
};

export const controls = {
  showCloseButton: {
    type: "boolean",
    default: true,
  },
} satisfies ControlsConfig;

export function Playground(props: PlaygroundProps<typeof controls>) {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>
        Open Dialog
      </DialogTrigger>
      <DialogContent showCloseButton={props.showCloseButton}>
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Make changes to your profile here. Click save when done.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" defaultValue="John Doe" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" defaultValue="john@example.com" />
          </div>
        </div>
        <DialogFooter>
          <Button>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const examples = [
  {
    name: "Simple Dialog",
    render: () => (
      <Dialog>
        <DialogTrigger render={<Button variant="outline" />}>
          Open
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dialog Title</DialogTitle>
            <DialogDescription>This is a simple dialog.</DialogDescription>
          </DialogHeader>
          <p>Dialog content goes here.</p>
          <DialogFooter showCloseButton>
            <Button>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    ),
  },
  {
    name: "Without Close Button",
    render: () => (
      <Dialog>
        <DialogTrigger render={<Button variant="outline" />}>
          Open
        </DialogTrigger>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>No Close Button</DialogTitle>
            <DialogDescription>
              This dialog has no X button in the corner.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton>
            <Button>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    ),
  },
];
