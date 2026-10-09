import { AppShell } from "@/components/AppShell";
import { SiteFooter } from "@/components/site/SiteFooter";

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return <AppShell footer={<SiteFooter inset />}>{children}</AppShell>;
}
