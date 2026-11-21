import { BookOpen, ChartLine, Settings, Sprout, Sun, Timer, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; also?: readonly string[] };

/** 4 tabs (docs/DESIGN.md §5). `also` = other sections that light up the same tab. */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", label: "Сегодня", icon: Sun, also: ["/settings/", "/checkin/", "/habits/"] },
  { href: "/focus/", label: "Фокус", icon: Timer, also: ["/test/", "/breathe/"] },
  { href: "/tree/", label: "Сад", icon: Sprout },
  { href: "/insights/", label: "Инсайты", icon: ChartLine, also: ["/library/", "/week/", "/history/"] },
];

/** Extra desktop-sidebar items (mobile reaches them from screens). */
export const SIDEBAR_EXTRA: readonly NavItem[] = [
  { href: "/library/", label: "Библиотека", icon: BookOpen },
  { href: "/settings/", label: "Настройки", icon: Settings },
];

/** Full-screen «night»/wizard routes: no navigation chrome. */
export const IMMERSIVE: readonly string[] = ["/checkin/", "/test/", "/week/", "/breathe/"];

/** True when `pathname` belongs to the section `href`. */
export function isActive(pathname: string, href: string): boolean {
  const norm = (p: string) => (p.endsWith("/") ? p : `${p}/`);
  if (href === "/") return pathname === "/" || pathname === "";
  return norm(pathname).startsWith(href);
}

/** Tab highlighted for `pathname` (its own section or one listed in `also`). */
export function isTabActive(pathname: string, item: NavItem): boolean {
  return isActive(pathname, item.href) || (item.also ?? []).some((h) => isActive(pathname, h));
}
