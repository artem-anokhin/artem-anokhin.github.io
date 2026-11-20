"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isDemo } from "@/lib/demo";
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
        if (!p) return router.replace(WELCOME);
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

  // Onboarding and the privacy page are full-screen, without navigation.
  if (onWelcome) return <main>{children}</main>;

  const immersive = IMMERSIVE.some((h) => isActive(pathname, h));
  const content = ready ? children : <div aria-busy="true" className="card h-48 animate-pulse" />;

  // Check-in, test and weekly review: full-screen, no chrome.
  if (immersive) return <main className="min-h-dvh">{content}</main>;

  return (
    <div className="min-h-dvh md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:sticky md:top-0 md:flex md:h-dvh md:w-64 md:shrink-0 md:flex-col md:gap-8 md:bg-surface md:p-6 md:shadow-soft">
        <Link href="/" className="font-display text-2xl font-black text-navy">
          Focus<span className="text-accent">AI</span>
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
                className={`flex min-h-12 items-center gap-3 rounded-[18px] px-4 font-semibold transition-colors ${
                  active ? "bg-soft text-navy" : "text-muted hover:bg-soft/60 hover:text-ink"
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

      <main className="mx-auto w-full max-w-3xl px-5 pt-6 pb-32 md:px-10 md:pt-10 md:pb-12">
        {demo && (
          <p role="note" className="mb-6 inline-flex items-center gap-2 rounded-full bg-sand px-4 py-2 text-[13px] font-semibold text-sand-ink">
            <Info aria-hidden size={16} />
            <span>
              <strong>Демо-данные.</strong> Пример, а не ваши результаты ·{" "}
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
        className="fixed inset-x-3 bottom-[calc(12px+env(safe-area-inset-bottom))] z-20 rounded-full bg-surface/92 shadow-soft backdrop-blur-md md:hidden"
      >
        <ul className="grid grid-cols-4 p-1.5">
          {NAV_ITEMS.map((item) => {
            const { href, label, icon: Icon } = item;
            const active = isTabActive(pathname, item);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`pressable flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-full text-[13px] leading-tight ${
                    active ? "bg-soft font-semibold text-navy" : "font-medium text-muted"
                  }`}
                >
                  <Icon aria-hidden size={22} strokeWidth={active ? 2.4 : 2} />
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
