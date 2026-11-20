import { BookOpen, ChartLine, Sprout, Sun, Timer, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", label: "Сегодня", icon: Sun },
  { href: "/test/", label: "Тест", icon: Timer },
  { href: "/insights/", label: "Инсайты", icon: ChartLine },
  { href: "/tree/", label: "Дерево", icon: Sprout },
  { href: "/library/", label: "Библиотека", icon: BookOpen },
];

/** True when `pathname` belongs to the section `href`. */
export function isActive(pathname: string, href: string): boolean {
  const norm = (p: string) => (p.endsWith("/") ? p : `${p}/`);
  if (href === "/") return pathname === "/" || pathname === "";
  return norm(pathname).startsWith(href);
}
