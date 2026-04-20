import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

import type { ControlsConfig, PlaygroundProps } from "@/lib/demo-types";

export const meta = {
  name: "Tabs",
  description: "A set of layered sections of content shown one at a time.",
  category: "navigation",
  install: "pnpm dlx shadcn@latest add @perimeter/tabs",
};

export const controls = {
  variant: {
    type: "enum",
    options: ["default", "line"],
    default: "default",
  },
} satisfies ControlsConfig;

export function Playground(props: PlaygroundProps<typeof controls>) {
  return (
    <Tabs defaultValue="account">
      <TabsList variant={props.variant as "default"}>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="account">
        <p className="text-sm text-muted-foreground">
          Make changes to your account here.
        </p>
      </TabsContent>
      <TabsContent value="password">
        <p className="text-sm text-muted-foreground">
          Change your password here.
        </p>
      </TabsContent>
      <TabsContent value="settings">
        <p className="text-sm text-muted-foreground">
          Manage your settings here.
        </p>
      </TabsContent>
    </Tabs>
  );
}

export const examples = [
  {
    name: "Default Variant",
    render: () => (
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Overview</TabsTrigger>
          <TabsTrigger value="tab2">Analytics</TabsTrigger>
          <TabsTrigger value="tab3">Reports</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">
          <p className="text-sm text-muted-foreground">Overview content.</p>
        </TabsContent>
        <TabsContent value="tab2">
          <p className="text-sm text-muted-foreground">Analytics content.</p>
        </TabsContent>
        <TabsContent value="tab3">
          <p className="text-sm text-muted-foreground">Reports content.</p>
        </TabsContent>
      </Tabs>
    ),
  },
  {
    name: "Line Variant",
    render: () => (
      <Tabs defaultValue="tab1">
        <TabsList variant="line">
          <TabsTrigger value="tab1">Overview</TabsTrigger>
          <TabsTrigger value="tab2">Analytics</TabsTrigger>
          <TabsTrigger value="tab3">Reports</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">
          <p className="text-sm text-muted-foreground">Overview content.</p>
        </TabsContent>
        <TabsContent value="tab2">
          <p className="text-sm text-muted-foreground">Analytics content.</p>
        </TabsContent>
        <TabsContent value="tab3">
          <p className="text-sm text-muted-foreground">Reports content.</p>
        </TabsContent>
      </Tabs>
    ),
  },
];
