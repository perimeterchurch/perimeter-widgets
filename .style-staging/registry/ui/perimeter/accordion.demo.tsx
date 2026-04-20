import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./accordion";

import type { ControlsConfig, PlaygroundProps } from "@/lib/demo-types";

export const meta = {
  name: "Accordion",
  description:
    "A vertically stacked set of interactive headings that reveal content.",
  category: "layout",
  install: "pnpm dlx shadcn@latest add @perimeter/accordion",
};

export const controls = {
  disabled: {
    type: "boolean",
    default: false,
  },
} satisfies ControlsConfig;

export function Playground(props: PlaygroundProps<typeof controls>) {
  return (
    <Accordion className="max-w-sm" disabled={props.disabled}>
      <AccordionItem value="item-1">
        <AccordionTrigger>What is this?</AccordionTrigger>
        <AccordionContent>
          A collapsible content section built with accessible patterns.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>How does it work?</AccordionTrigger>
        <AccordionContent>
          Click a trigger to expand or collapse its content panel.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-3">
        <AccordionTrigger>Is it accessible?</AccordionTrigger>
        <AccordionContent>
          Yes, it follows the WAI-ARIA Accordion pattern.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export const examples = [
  {
    name: "Single Open",
    render: () => (
      <Accordion className="max-w-sm">
        <AccordionItem value="faq-1">
          <AccordionTrigger>Can I customize the styling?</AccordionTrigger>
          <AccordionContent>
            Yes, all components support className overrides.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="faq-2">
          <AccordionTrigger>Does it support animations?</AccordionTrigger>
          <AccordionContent>
            Yes, it uses CSS animations for smooth transitions.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    ),
  },
  {
    name: "Default Open",
    render: () => (
      <Accordion className="max-w-sm" defaultValue={["faq-1"]}>
        <AccordionItem value="faq-1">
          <AccordionTrigger>Open by default</AccordionTrigger>
          <AccordionContent>
            This item is expanded when the page loads.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="faq-2">
          <AccordionTrigger>Collapsed by default</AccordionTrigger>
          <AccordionContent>Click to expand this content.</AccordionContent>
        </AccordionItem>
      </Accordion>
    ),
  },
];
