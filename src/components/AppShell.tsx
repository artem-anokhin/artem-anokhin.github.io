"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isDemo } from "@/lib/demo";
import { rememberReturn } from "@/lib/returnTo";
import { IMMERSIVE, NAV_ITEMS, SIDEBAR_EXTRA, isActive, isTabActive } from "@/lib/nav";
import { Info } from "lucide-react";
import { getProfile } from "@/lib/settings";

const WELCOME = "/welcome/";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  // Onboarding and the public privacy policy work without consent and without navigation.
  const onWelcome = isActive(pathname, WELCOME) || isActive(pathname, "/privacy/");
  // Render page content only after consent is confirmed (no first-run flash).
  const [ready, setReady] = useState(false);
  const [demo, setDemo] = useState(false);

  // Send first-time users (no consent yet) to onboarding.
  useEffect(() => {
    if (onWelcome) return;
    let alive = true;
    getProfile()
      .then((p) => {
        if (!alive) return;
        if (!p) {
          rememberReturn(`${window.location.pathname}${window.location.search}`);
          return router.replace(WELCOME);
        }
        setReady(true);
        return isDemo().then((d) => alive && setDemo(d));
      })
      // Fail closed: if storage can't be read, go to onboarding rather than the app.
      .catch(() => {
        if (alive) router.replace(WELCOME);
      });
    return () => {
      alive = false;
    };
  }, [onWelcome, router]);

  // Re-check the demo flag on client navigation (e.g. after «убрать» on another screen).
  useEffect(() => {
    if (onWelcome || !ready) return;
    let alive = true;
    isDemo()
      .then((d) => alive && setDemo(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [pathname, onWelcome, ready]);

  // Onboarding and the privacy page are full-screen, without navigation.
  if (onWelcome) return <main>{children}</main>;

  const immersive = IMMERSIVE.some((h) => isActive(pathname, h));
  // The Focus tab is a dark («night») screen: dark tab bar there.
  const dark = isActive(pathname, "/focus/");
  const content = ready ? children : <div aria-busy="true" className="card h-48 animate-pulse" />;

  // Check-in, test and weekly review: full-screen, no chrome.
  if (immersive) return <main className="min-h-dvh">{content}</main>;

  return (
    <div className="min-h-dvh md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:sticky md:top-0 md:flex md:h-dvh md:w-64 md:shrink-0 md:flex-col md:gap-8 md:border-r md:border-line md:bg-chrome md:p-6">
        <Link href="/" className="text-[17px] font-bold tracking-[-0.01em] text-ink">
          Focus<span className="text-link">AI</span>
        </Link>
        <nav aria-label="Основная навигация" className="flex flex-col gap-1">
          {[...NAV_ITEMS, ...SIDEBAR_EXTRA].map((item) => {
            const { href, label, icon: Icon } = item;
            const active = SIDEBAR_EXTRA.includes(item) ? isActive(pathname, href) : isTabActive(pathname, item);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-[10px] px-3 font-medium transition-colors ${
                  active ? "bg-accent text-white" : "text-ink hover:bg-black/5"
                }`}
              >
                <Icon aria-hidden size={20} />
                {label}
              </Link>
            );
          })}
        </nav>
        <p className="mt-auto text-[13px] text-muted">Не является медицинской консультацией</p>
      </aside>

      <main className="mx-auto w-full max-w-2xl px-4 pt-4 pb-28 md:px-10 md:pt-10 md:pb-12">
        {demo && (
          <p role="note" className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-muted">
            <Info aria-hidden size={16} />
            <span>
              <strong>Демо-данные.</strong> Пример ·{" "}
              <Link href="/settings/" className="underline underline-offset-2">
                убрать
              </Link>
            </span>
          </p>
        )}
        {content}
        <p className="mt-8 text-center text-[13px] text-muted md:hidden">Не является медицинской консультацией</p>
      </main>

      {/* Mobile floating bottom navigation */}
      <nav
        aria-label="Основная навигация"
        className={`fixed inset-x-0 bottom-0 z-20 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden ${
          dark ? "border-white/10 bg-[#121212]/90" : "border-line bg-chrome/90"
        }`}
      >
        <ul className="grid grid-cols-4">
          {NAV_ITEMS.map((item) => {
            const { href, label, icon: Icon } = item;
            const active = isTabActive(pathname, item);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-[52px] flex-col items-center justify-center gap-0.5 pt-1 text-[11px] leading-tight font-medium ${
                    active ? (dark ? "text-link-night" : "text-link") : dark ? "text-night-muted" : "text-tab-off"
                  }`}
                >
                  <Icon aria-hidden size={24} strokeWidth={active ? 2.2 : 1.8} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
