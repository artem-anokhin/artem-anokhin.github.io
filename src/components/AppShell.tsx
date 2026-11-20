"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isDemo } from "@/lib/demo";
import { NAV_ITEMS, SIDEBAR_EXTRA, isActive } from "@/lib/nav";
import { getProfile } from "@/lib/settings";

const WELCOME = "/welcome/";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const onWelcome = isActive(pathname, WELCOME);
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

  // Onboarding is full-screen, without navigation.
  if (onWelcome) return <main>{children}</main>;

  return (
    <div className="min-h-dvh md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col md:gap-8 md:border-r-[1.5px] md:border-line md:bg-card md:p-6">
        <Link href="/" className="title text-2xl">
          Focus<span className="text-accent">AI</span>
        </Link>
        <nav aria-label="Основная навигация" className="flex flex-col gap-1">
          {[...NAV_ITEMS, ...SIDEBAR_EXTRA].map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-2xl px-4 font-medium transition-colors ${
                  active ? "bg-soft text-navy" : "text-muted hover:bg-soft/60 hover:text-ink"
                }`}
              >
                <Icon aria-hidden size={20} />
                {label}
              </Link>
            );
          })}
        </nav>
        <p className="mt-auto text-sm text-muted">Не является медицинской консультацией</p>
      </aside>

      <main className="mx-auto w-full max-w-3xl px-4 pt-6 pb-28 md:px-10 md:pt-10 md:pb-10">
        {demo && (
          <p role="note" className="mb-4 rounded-2xl border-[1.5px] border-line bg-soft px-4 py-3 text-sm text-ink">
            <strong className="font-semibold">Демо-данные.</strong> Это пример, а не ваши результаты. Убрать можно в{" "}
            <Link href="/settings/" className="font-semibold text-navy underline underline-offset-4">
              настройках
            </Link>
            .
          </p>
        )}
        {ready ? children : <div aria-busy="true" className="card h-48 animate-pulse" />}
        <p className="mt-6 text-center text-sm text-muted md:hidden">
          Не является медицинской консультацией
        </p>
      </main>

      {/* Mobile bottom navigation */}
      <nav
        aria-label="Основная навигация"
        className="fixed inset-x-0 bottom-0 z-20 border-t-[1.5px] border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <ul className="grid grid-cols-5">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 text-xs leading-tight tracking-tight font-medium ${
                    active ? "text-accent" : "text-muted"
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
