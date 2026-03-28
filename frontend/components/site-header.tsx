"use client";

import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { siteConfig } from "@/config/site";

export function SiteHeader() {
  const pathname = usePathname();

  const getPageTitle = () => {
    // Check grouped navMain
    for (const group of siteConfig.navMain) {
      const foundItem = group.items.find((item) => item.url === pathname);
      if (foundItem) return foundItem.title;
    }

    // Check navSecondary
    const navSecondaryItem = siteConfig.navSecondary.find(
      (item) => item.url === pathname,
    );
    if (navSecondaryItem) return navSecondaryItem.title;

    // Check navUser
    const navUserItem = siteConfig.navUser.find(
      (item) => item.url === pathname,
    );
    if (navUserItem) return navUserItem.title;

    return siteConfig.company.name;
  };

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">{getPageTitle()}</h1>
      </div>
    </header>
  );
}
