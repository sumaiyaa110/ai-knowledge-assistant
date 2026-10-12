import {
  FileText,
  LayoutDashboard,
  MessageSquare,
  Sparkles,
  User,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "Chat", href: "/chat", icon: MessageSquare },
  { label: "AI Tools", href: "/tools", icon: Sparkles },
  { label: "Profile", href: "/profile", icon: User },
];

export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The nav label for the current route, used as the header title. */
export function getPageTitle(pathname: string): string {
  return NAV_ITEMS.find((item) => isActivePath(pathname, item.href))?.label ?? "";
}
