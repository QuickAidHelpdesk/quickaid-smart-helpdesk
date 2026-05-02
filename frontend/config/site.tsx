import {
  TicketsIcon,
  LayoutDashboardIcon,
  ListIcon,
  ChartBarIcon,
  FolderIcon,
  UsersIcon,
  Settings2Icon,
  CircleHelpIcon,
  SearchIcon,
  DatabaseIcon,
  FileChartColumnIcon,
  FileIcon,
  CommandIcon,
  CirclePlusIcon,
  TicketIcon,
  InboxIcon,
  CheckCircleIcon,
  BookOpenIcon,
  BuildingIcon,
  ShieldCheckIcon,
  GitMergeIcon,
  ActivityIcon,
  CircleUserRoundIcon,
  CreditCardIcon,
  BellIcon,
} from "lucide-react";

type NavRole = "user" | "agent" | "admin";

export interface NavGroup {
  title: string;
  roles?: NavRole[];
  items: { title: string; url: string; icon?: React.ReactNode; badge?: number }[];
}

export const siteConfig = {
  // Paths
  publicPaths: ["/", "/404", "/login", "/logout", "/register", "/signup"],
  wrapperDisabledPaths: ["/", "/404", "/login", "/logout", "/register", "/signup"],

  // Branding
  company: {
    name: "QuickAid",
    url: "/dashboard",
    logo: TicketsIcon,
  },

  // Default User
  user: {
    name: "User",
    email: "user@example.com",
    avatar: "",
    fallback: "U",
  },

  // Quick Create Action
  quickCreate: {
    title: "Quick Create",
    url: "/tickets/new",
    icon: <CirclePlusIcon />,
  },

  // Main Navigation
  navMain: [
    {
      title: "Workspace",
      items: [
        {
          title: "Dashboard",
          url: "/dashboard",
          icon: <LayoutDashboardIcon />,
        },
        {
          title: "My Tickets",
          url: "/tickets",
          icon: <TicketIcon />,
        },
        {
          title: "Notifications",
          url: "/notifications",
          icon: <BellIcon />,
        },
      ],
    },
    {
      title: "Agent",
      roles: ["agent", "admin"] as NavRole[],
      items: [
        {
          title: "Assigned Tickets",
          url: "/assigned-tickets",
          icon: <InboxIcon />,
        },
      ],
    },
    {
      title: "Management",
      roles: ["admin"] as NavRole[],
      items: [
        {
          title: "Users",
          url: "/admin/users",
          icon: <UsersIcon />,
        },
        {
          title: "Agents & Teams",
          url: "/admin/agents-and-teams",
          icon: <BuildingIcon />,
        },
        {
          title: "Insights & Monitoring",
          url: "/admin/insights",
          icon: <ActivityIcon />,
        },
      ],
    },
  ],

  // Secondary Navigation (Bottom)
  navSecondary: [
  ],

  // User Navigation
  navUser: [
    {
      title: "Account",
      url: "/account",
      icon: <CircleUserRoundIcon />,
    },
    {
      title: "Billing",
      url: "/billing",
      icon: <CreditCardIcon />,
    },
    {
      title: "Notifications",
      url: "/notifications",
      icon: <BellIcon />,
    },
  ],
};
