"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@registry/ui/perimeter/accordion";
import { Badge } from "@registry/ui/perimeter/badge";
import { Button } from "@registry/ui/perimeter/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@registry/ui/perimeter/card";
import {
  CalendarIcon,
  HeartIcon,
  MapPinIcon,
  MusicIcon,
  UsersIcon,
} from "lucide-react";

export const meta = {
  name: "Marketing Landing",
  description:
    "Marketing landing page with hero section, feature cards, and FAQ accordion.",
  components: ["card", "button", "badge", "accordion"],
};

const FEATURES = [
  {
    icon: CalendarIcon,
    title: "Sunday Services",
    description:
      "Join us every Sunday at 9:00 AM and 11:00 AM for worship, teaching, and community.",
  },
  {
    icon: UsersIcon,
    title: "Small Groups",
    description:
      "Connect with others in weekly small groups that meet across Gwinnett County.",
  },
  {
    icon: HeartIcon,
    title: "Serve Together",
    description:
      "Find your place on one of our ministry teams and make a difference in your community.",
  },
  {
    icon: MusicIcon,
    title: "Worship & Arts",
    description:
      "Experience meaningful worship through music, creative arts, and multimedia.",
  },
  {
    icon: MapPinIcon,
    title: "Multiple Campuses",
    description:
      "Three locations in Peachtree Corners, Hamilton Mill, and Buford for your convenience.",
  },
  {
    icon: CalendarIcon,
    title: "Events & Programs",
    description:
      "Year-round events for all ages including camps, retreats, and community outreach.",
  },
] as const;

const FAQS = [
  {
    question: "What time are Sunday services?",
    answer:
      "We offer two services every Sunday: 9:00 AM and 11:00 AM at all three campus locations. Doors open 15 minutes before each service.",
  },
  {
    question: "Is there childcare available?",
    answer:
      "Yes! We provide safe, fun, and age-appropriate environments for children from birth through 5th grade during every Sunday service. Check-in opens 15 minutes before the service.",
  },
  {
    question: "How do I join a small group?",
    answer:
      "Visit our small groups page to browse available groups by day, time, location, and topic. You can sign up online or ask at the Welcome Center on any Sunday.",
  },
  {
    question: "What should I expect on my first visit?",
    answer:
      "Expect a warm welcome, contemporary worship music, and practical Bible teaching. Dress is casual. Stop by the Welcome Center in the lobby for a free gift and to learn more about getting connected.",
  },
  {
    question: "How can I start serving?",
    answer:
      "We'd love to have you on our team! Fill out a volunteer interest form online or visit the Serve desk in the lobby. We have opportunities for every skill set and schedule.",
  },
] as const;

export default function MarketingLandingTemplate() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center gap-6 px-6 py-24 text-center">
        <Badge variant="secondary">Welcome to Perimeter Church</Badge>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          A place to belong, believe, and become
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Whether you&apos;re exploring faith for the first time or looking for
          a church to call home, we&apos;d love to meet you. Join us this
          Sunday.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button size="lg">Plan Your Visit</Button>
          <Button variant="outline" size="lg">
            Watch Online
          </Button>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="border-t bg-muted/30 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold">Get Connected</h2>
            <p className="mt-2 text-muted-foreground">
              There are many ways to grow and connect at Perimeter Church.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <Card key={feature.title}>
                <CardHeader>
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="size-5 text-primary" />
                  </div>
                  <CardTitle className="mt-3">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="border-t px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold">Ready to take the next step?</h2>
          <p className="mt-3 text-lg text-muted-foreground">
            Join thousands of families who call Perimeter Church home. We
            can&apos;t wait to welcome you.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button size="lg">Get Started</Button>
            <Button variant="outline" size="lg">
              Contact Us
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t bg-muted/30 px-6 py-20">
        <div className="mx-auto max-w-2xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold">Frequently Asked Questions</h2>
            <p className="mt-2 text-muted-foreground">
              Everything you need to know about visiting Perimeter Church.
            </p>
          </div>
          <div className="mt-10">
            <Accordion>
              {FAQS.map((faq, index) => (
                <AccordionItem key={faq.question} value={`faq-${index}`}>
                  <AccordionTrigger>{faq.question}</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-muted-foreground">{faq.answer}</p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-6 py-10">
        <div className="mx-auto max-w-6xl text-center text-sm text-muted-foreground">
          <p>Perimeter Church &middot; Peachtree Corners, GA</p>
        </div>
      </footer>
    </div>
  );
}
