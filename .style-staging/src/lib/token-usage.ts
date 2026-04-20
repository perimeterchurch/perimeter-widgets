export interface TokenGroup {
  name: string;
  tokens: string[];
  usedBy: string[];
  isNonColor?: boolean;
}

export interface TokenValues {
  light: Record<string, string>;
  dark: Record<string, string>;
}

export const TOKEN_GROUPS: TokenGroup[] = [
  {
    name: "Primary",
    tokens: ["primary", "primary-foreground"],
    usedBy: ["button (default)", "badge (default)", "links"],
  },
  {
    name: "Secondary",
    tokens: ["secondary", "secondary-foreground"],
    usedBy: ["button (secondary)", "badge (secondary)"],
  },
  {
    name: "Destructive",
    tokens: ["destructive", "destructive-foreground"],
    usedBy: [
      "button (destructive)",
      "badge (destructive)",
      "alert (destructive)",
    ],
  },
  {
    name: "Success",
    tokens: ["success", "success-foreground"],
    usedBy: ["alert (success)", "badge (success)"],
  },
  {
    name: "Warning",
    tokens: ["warning", "warning-foreground"],
    usedBy: ["alert (warning)"],
  },
  {
    name: "Info",
    tokens: ["info", "info-foreground"],
    usedBy: ["alert (info)"],
  },
  {
    name: "Background",
    tokens: ["background", "foreground"],
    usedBy: ["page background", "default text color"],
  },
  {
    name: "Muted",
    tokens: ["muted", "muted-foreground"],
    usedBy: ["disabled states", "placeholder text", "secondary text"],
  },
  {
    name: "Accent",
    tokens: ["accent", "accent-foreground"],
    usedBy: ["hover states", "active sidebar items"],
  },
  {
    name: "Card",
    tokens: ["card", "card-foreground"],
    usedBy: ["card", "dialog", "dropdown-menu"],
  },
  {
    name: "Popover",
    tokens: ["popover", "popover-foreground"],
    usedBy: ["popover", "hover-card", "command"],
  },
  {
    name: "Border & Input",
    tokens: ["border", "input", "ring"],
    usedBy: ["input borders", "card borders", "focus rings"],
  },
  {
    name: "Charts",
    tokens: ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"],
    usedBy: ["chart"],
  },
  {
    name: "Sidebar",
    tokens: [
      "sidebar",
      "sidebar-foreground",
      "sidebar-primary",
      "sidebar-primary-foreground",
      "sidebar-accent",
      "sidebar-accent-foreground",
      "sidebar-border",
      "sidebar-ring",
    ],
    usedBy: ["sidebar"],
  },
  {
    name: "Layout",
    tokens: ["radius"],
    usedBy: ["all components with rounded corners"],
    isNonColor: true,
  },
];
