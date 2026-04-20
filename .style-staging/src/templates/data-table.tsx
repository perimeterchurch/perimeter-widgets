"use client";

import { Badge } from "@registry/ui/perimeter/badge";
import { Button } from "@registry/ui/perimeter/button";
import { Input } from "@registry/ui/perimeter/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@registry/ui/perimeter/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@registry/ui/perimeter/table";
import { SearchIcon } from "lucide-react";

export const meta = {
  name: "Data Table",
  description:
    "Filterable data table with search, status badges, and pagination controls.",
  components: ["table", "input", "badge", "pagination", "button"],
};

const MEMBERS = [
  {
    id: "MBR-001",
    name: "Sarah Johnson",
    email: "sarah.j@example.com",
    campus: "Peachtree Corners",
    status: "active",
    joined: "Jan 15, 2024",
  },
  {
    id: "MBR-002",
    name: "Michael Chen",
    email: "m.chen@example.com",
    campus: "Hamilton Mill",
    status: "active",
    joined: "Feb 3, 2024",
  },
  {
    id: "MBR-003",
    name: "Emily Rodriguez",
    email: "emily.r@example.com",
    campus: "Peachtree Corners",
    status: "pending",
    joined: "Mar 12, 2024",
  },
  {
    id: "MBR-004",
    name: "David Kim",
    email: "d.kim@example.com",
    campus: "Buford",
    status: "active",
    joined: "Mar 28, 2024",
  },
  {
    id: "MBR-005",
    name: "Jessica Park",
    email: "j.park@example.com",
    campus: "Hamilton Mill",
    status: "inactive",
    joined: "Apr 5, 2024",
  },
  {
    id: "MBR-006",
    name: "James Wilson",
    email: "j.wilson@example.com",
    campus: "Peachtree Corners",
    status: "active",
    joined: "Apr 18, 2024",
  },
  {
    id: "MBR-007",
    name: "Maria Garcia",
    email: "m.garcia@example.com",
    campus: "Buford",
    status: "active",
    joined: "May 2, 2024",
  },
  {
    id: "MBR-008",
    name: "Robert Lee",
    email: "r.lee@example.com",
    campus: "Peachtree Corners",
    status: "pending",
    joined: "May 20, 2024",
  },
] as const;

function statusVariant(status: string) {
  switch (status) {
    case "active":
      return "default" as const;
    case "pending":
      return "secondary" as const;
    case "inactive":
      return "outline" as const;
    default:
      return "outline" as const;
  }
}

export default function DataTableTemplate() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Members</h1>
        <p className="mt-1 text-muted-foreground">
          Manage church member records and contact information.
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search members..." className="pl-8" />
        </div>
        <Button variant="outline">Export</Button>
        <Button>Add Member</Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Campus</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MEMBERS.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {member.id}
                </TableCell>
                <TableCell className="font-medium">{member.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {member.email}
                </TableCell>
                <TableCell>{member.campus}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant(member.status)}>
                    {member.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {member.joined}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing 1-8 of 247 members
        </p>
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="#" />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#" isActive>
                1
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#">2</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#">3</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
            <PaginationItem>
              <PaginationNext href="#" />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}
