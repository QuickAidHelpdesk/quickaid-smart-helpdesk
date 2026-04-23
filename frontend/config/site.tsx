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

export const siteConfig = {
  // Paths
  publicPaths: ["/", "/404", "/login", "/logout", "/register"],
  wrapperDisabledPaths: ["/", "/404", "/login", "/logout", "/register"],

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
          title: "Create Ticket",
          url: "/tickets/new",
          icon: <CirclePlusIcon />,
        },
      ],
    },
    {
      title: "Staff",
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
    {
      title: "Search",
      url: "/search",
      icon: <SearchIcon />,
    },
    {
      title: "Get Help",
      url: "/help",
      icon: <CircleHelpIcon />,
    },
    {
      title: "Settings",
      url: "/settings",
      icon: <Settings2Icon />,
    },
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
