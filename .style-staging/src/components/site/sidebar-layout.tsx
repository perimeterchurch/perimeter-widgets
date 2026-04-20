import { DocsSidebar } from "@/components/site/docs-sidebar";

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex">
      <DocsSidebar />
      <main className="flex-1 min-w-0 p-8">{children}</main>
    </div>
  );
}
