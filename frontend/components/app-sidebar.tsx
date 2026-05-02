"use client";

import * as React from "react";
import Link from "next/link";

import { siteConfig, NavGroup } from "@/config/site";
import { useAuth } from "@/context/auth-context";
import { useNotifications } from "@/context/notification-context";
import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const Logo = siteConfig.company.logo;

  const filteredNavMain = (siteConfig.navMain as NavGroup[])
    .filter((group) => !group.roles || (user?.role != null && group.roles.includes(user.role)))
    .map((group) => ({
      ...group,
      items: group.items.map((item) =>
        item.url === "/notifications"
          ? { ...item, badge: unreadCount > 0 ? unreadCount : undefined }
          : item
      ),
    }));

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip={siteConfig.company.name}
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link href={siteConfig.company.url}>
                <Logo className="size-5!" />
                <span className="text-base font-semibold">
                  {siteConfig.company.name}
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={filteredNavMain} action={siteConfig.quickCreate} />
        <div className="mt-auto">
          <Separator className="mx-auto hidden w-4 group-data-[collapsible=icon]:block group-data-[collapsible=icon]:mb-2" />
          <NavSecondary items={siteConfig.navSecondary} />
        </div>
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={{
            name: user?.display_name ?? siteConfig.user.name,
            email: user?.email ?? siteConfig.user.email,
            avatar: siteConfig.user.avatar,
            fallback: user?.display_name?.[0] ?? siteConfig.user.fallback,
          }}
          menuItems={siteConfig.navUser}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
