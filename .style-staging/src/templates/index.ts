import { lazy } from "react";

interface TemplateMeta {
  name: string;
  description: string;
  components: string[];
}

interface TemplateEntry {
  slug: TemplateSlug;
  meta: TemplateMeta;
}

const TEMPLATE_SLUGS = [
  "dashboard",
  "settings",
  "login",
  "data-table",
  "marketing-landing",
] as const;

type TemplateSlug = (typeof TEMPLATE_SLUGS)[number];

const templateComponents: Record<
  TemplateSlug,
  React.LazyExoticComponent<React.ComponentType>
> = {
  dashboard: lazy(() => import("./dashboard")),
  settings: lazy(() => import("./settings")),
  login: lazy(() => import("./login")),
  "data-table": lazy(() => import("./data-table")),
  "marketing-landing": lazy(() => import("./marketing-landing")),
};

/**
 * Static meta data for all templates, available without dynamic imports.
 * Kept in sync with the meta exports in each template file.
 */
const TEMPLATE_ENTRIES: TemplateEntry[] = [
  {
    slug: "dashboard",
    meta: {
      name: "Dashboard",
      description:
        "Admin dashboard with sidebar navigation, stats cards, and tabbed content.",
      components: ["card", "tabs", "avatar", "badge"],
    },
  },
  {
    slug: "settings",
    meta: {
      name: "Settings",
      description:
        "Settings page with tabbed sections for profile, notifications, and appearance.",
      components: [
        "tabs",
        "card",
        "input",
        "select",
        "switch",
        "label",
        "button",
        "separator",
      ],
    },
  },
  {
    slug: "login",
    meta: {
      name: "Login",
      description:
        "Centered login card with email and password fields, remember me toggle, and social sign-in.",
      components: ["card", "input", "label", "button", "checkbox"],
    },
  },
  {
    slug: "data-table",
    meta: {
      name: "Data Table",
      description:
        "Filterable data table with search, status badges, and pagination controls.",
      components: ["table", "input", "badge", "pagination", "button"],
    },
  },
  {
    slug: "marketing-landing",
    meta: {
      name: "Marketing Landing",
      description:
        "Marketing landing page with hero section, feature cards, and FAQ accordion.",
      components: ["card", "button", "badge", "accordion"],
    },
  },
];

export { TEMPLATE_ENTRIES, TEMPLATE_SLUGS, templateComponents };
export type { TemplateMeta, TemplateSlug };
