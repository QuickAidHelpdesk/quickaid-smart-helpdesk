import {
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
} from "lucide-react";

export const siteConfig = {
  // Branding
  company: {
    name: "QuickAid",
    logo: CommandIcon,
  },

  // Default User
  user: {
    name: "User",
    email: "user@example.com",
    avatar: "",
  },

  // Quick Create Action
  quickCreate: {
    title: "Quick Create",
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
          url: "/tickets/mine",
          icon: <InboxIcon />,
        },
        {
          title: "All Tickets",
          url: "/tickets",
          icon: <TicketIcon />,
        },
        {
          title: "Resolved",
          url: "/tickets/resolved",
          icon: <CheckCircleIcon />,
        },
      ],
    },
    {
      title: "Management",
      items: [
        {
          title: "Customers",
          url: "/customers",
          icon: <BuildingIcon />,
        },
        {
          title: "Agents & Teams",
          url: "/team",
          icon: <UsersIcon />,
        },
        {
          title: "Reports & Analytics",
          url: "/analytics",
          icon: <ChartBarIcon />,
        },
      ],
    },
    {
      title: "Administration",
      items: [
        {
          title: "Workflows & SLA",
          url: "/admin/workflows",
          icon: <GitMergeIcon />,
        },
        {
          title: "Security & Roles",
          url: "/admin/security",
          icon: <ShieldCheckIcon />,
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
};
