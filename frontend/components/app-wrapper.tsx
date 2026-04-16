"use client";

import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { siteConfig } from "@/config/site";

export function AppWrapper({
  children,
  defaultOpen,
  defaultCollapsedMode,
}: {
  children: React.ReactNode;
  defaultOpen?: boolean;
  defaultCollapsedMode?: "icon" | "offcanvas";
}) {
  const pathname = usePathname();
  const isWrapperDisabled = siteConfig.wrapperDisabledPaths.includes(pathname);

  if (isWrapperDisabled) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      defaultCollapsedMode={defaultCollapsedMode}
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 p-4 lg:p-6">{children}</div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
