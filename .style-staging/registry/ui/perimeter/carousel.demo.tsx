import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "./carousel";
import { Card, CardContent } from "./card";

import type { ControlsConfig, PlaygroundProps } from "@/lib/demo-types";

export const meta = {
  name: "Carousel",
  description:
    "A scrollable carousel built on Embla for cycling through content.",
  category: "data-display",
  install: "pnpm dlx shadcn@latest add @perimeter/carousel",
};

export const controls = {
  orientation: {
    type: "enum",
    options: ["horizontal", "vertical"] as const,
    default: "horizontal",
  },
} satisfies ControlsConfig;

export function Playground(props: PlaygroundProps<typeof controls>) {
  const isVertical = props.orientation === "vertical";
  return (
    <div className="flex items-center justify-center">
      <Carousel
        orientation={props.orientation}
        className={
          isVertical
            ? "my-12 h-[200px] w-full max-w-xs"
            : "mx-14 w-full max-w-xs"
        }
      >
        <CarouselContent>
          {Array.from({ length: 5 }, (_, i) => (
            <CarouselItem key={i}>
              <div
                className={
                  isVertical
                    ? "flex h-full items-center justify-center p-1"
                    : "p-1"
                }
              >
                <Card className="w-full">
                  <CardContent className="flex items-center justify-center p-6">
                    <span className="text-2xl font-semibold">{i + 1}</span>
                  </CardContent>
                </Card>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  );
}

export const examples = [
  {
    name: "Basic Carousel",
    render: () => (
      <Carousel className="mx-14 w-full max-w-xs">
        <CarouselContent>
          {Array.from({ length: 5 }, (_, i) => (
            <CarouselItem key={i}>
              <div className="p-1">
                <Card>
                  <CardContent className="flex items-center justify-center p-6">
                    <span className="text-2xl font-semibold">{i + 1}</span>
                  </CardContent>
                </Card>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    ),
  },
  {
    name: "Multiple Per View",
    render: () => (
      <Carousel className="mx-14 w-full max-w-sm">
        <CarouselContent className="-ml-2">
          {Array.from({ length: 6 }, (_, i) => (
            <CarouselItem key={i} className="basis-1/3 pl-2">
              <div className="p-1">
                <Card>
                  <CardContent className="flex items-center justify-center p-4">
                    <span className="text-lg font-semibold">{i + 1}</span>
                  </CardContent>
                </Card>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    ),
  },
];
