import { SidebarLayout } from "@/components/site/sidebar-layout";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SidebarLayout>{children}</SidebarLayout>;
}
