"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@registry/ui/perimeter/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@registry/ui/perimeter/tabs";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@registry/ui/perimeter/avatar";
import { Badge } from "@registry/ui/perimeter/badge";
import {
  BarChartIcon,
  CalendarIcon,
  HomeIcon,
  SettingsIcon,
  UsersIcon,
} from "lucide-react";

export const meta = {
  name: "Dashboard",
  description:
    "Admin dashboard with sidebar navigation, stats cards, and tabbed content.",
  components: ["card", "tabs", "avatar", "badge"],
};

const NAV_ITEMS = [
  { icon: HomeIcon, label: "Overview", active: true },
  { icon: UsersIcon, label: "Members" },
  { icon: CalendarIcon, label: "Events" },
  { icon: BarChartIcon, label: "Analytics" },
  { icon: SettingsIcon, label: "Settings" },
] as const;

const STATS = [
  { title: "Total Members", value: "2,847", change: "+12%", trend: "up" },
  { title: "Weekly Attendance", value: "1,203", change: "+4%", trend: "up" },
  { title: "Small Groups", value: "86", change: "+2", trend: "up" },
  { title: "New Visitors", value: "34", change: "-3%", trend: "down" },
] as const;

const RECENT_ACTIVITY = [
  {
    name: "Sarah Johnson",
    initials: "SJ",
    action: "registered for Sunday service",
    time: "2 minutes ago",
  },
  {
    name: "Michael Chen",
    initials: "MC",
    action: "joined the Worship Team group",
    time: "15 minutes ago",
  },
  {
    name: "Emily Rodriguez",
    initials: "ER",
    action: "submitted a volunteer application",
    time: "1 hour ago",
  },
  {
    name: "David Kim",
    initials: "DK",
    action: "updated their contact info",
    time: "2 hours ago",
  },
  {
    name: "Jessica Park",
    initials: "JP",
    action: "RSVP'd to Youth Night",
    time: "3 hours ago",
  },
] as const;

const UPCOMING_EVENTS = [
  {
    name: "Sunday Worship",
    date: "Mar 30",
    attendees: 450,
    status: "confirmed",
  },
  { name: "Youth Night", date: "Apr 2", attendees: 85, status: "confirmed" },
  {
    name: "Community Dinner",
    date: "Apr 5",
    attendees: 120,
    status: "tentative",
  },
  {
    name: "Leadership Meeting",
    date: "Apr 7",
    attendees: 24,
    status: "confirmed",
  },
] as const;

export default function DashboardTemplate() {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r bg-card lg:block">
        <div className="flex h-14 items-center gap-2 border-b px-6">
          <div className="size-7 rounded-lg bg-primary" />
          <span className="font-semibold">Perimeter Admin</span>
        </div>
        <nav className="space-y-1 p-3">
          {NAV_ITEMS.map((item) => (
            <div
              key={item.label}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                "active" in item && item.active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <item.icon className="size-4" />
              {item.label}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <header className="flex h-14 items-center justify-between border-b px-6">
          <h1 className="text-lg font-semibold">Overview</h1>
          <div className="flex items-center gap-3">
            <Badge variant="outline">Admin</Badge>
            <Avatar size="sm">
              <AvatarImage src="" alt="User" />
              <AvatarFallback>AD</AvatarFallback>
            </Avatar>
          </div>
        </header>

        <div className="space-y-6 p-6">
          {/* Stats Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STATS.map((stat) => (
              <Card key={stat.title} size="sm">
                <CardHeader>
                  <CardDescription>{stat.title}</CardDescription>
                  <CardTitle className="text-2xl">{stat.value}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge
                    variant={stat.trend === "up" ? "default" : "destructive"}
                  >
                    {stat.change} this month
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tabbed Content */}
          <Tabs defaultValue="activity">
            <TabsList>
              <TabsTrigger value="activity">Recent Activity</TabsTrigger>
              <TabsTrigger value="events">Upcoming Events</TabsTrigger>
            </TabsList>

            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>
                    Latest actions from your church community.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {RECENT_ACTIVITY.map((item) => (
                      <div key={item.name} className="flex items-center gap-3">
                        <Avatar size="sm">
                          <AvatarFallback>{item.initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 text-sm">
                          <span className="font-medium">{item.name}</span>{" "}
                          <span className="text-muted-foreground">
                            {item.action}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {item.time}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="events">
              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Events</CardTitle>
                  <CardDescription>
                    Events scheduled for the next two weeks.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {UPCOMING_EVENTS.map((event) => (
                      <div
                        key={event.name}
                        className="flex items-center justify-between"
                      >
                        <div>
                          <p className="text-sm font-medium">{event.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {event.date} &middot; {event.attendees} expected
                          </p>
                        </div>
                        <Badge
                          variant={
                            event.status === "confirmed"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {event.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
