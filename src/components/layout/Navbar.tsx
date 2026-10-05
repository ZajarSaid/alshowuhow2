"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import logo from "@/logo.png";
import { useI18n } from "@/lib/i18n/context";
import LanguageSwitcher from "@/lib/i18n/LanguageSwitcher";
import { useRouter } from "next/navigation";

const HIDDEN_PATHS = ["/admin", "/vendor"];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: session, status } = useSession();
  const { locale, t } = useI18n();
  const router = useRouter();

  // Refresh rather than hard-reload: re-runs the server components in the new
  // language without discarding scroll position or re-downloading assets.
  const applyLocale = () => router.refresh();
  const pathname = usePathname();

  const closeMenu = () => setMobileOpen(false);
  const role = (session?.user as { role?: string } | undefined)?.role;
  const dashboardHref = role === "ADMIN" ? "/admin/dashboard" : "/vendor/dashboard";
  const isHome = pathname === "/";

  if (HIDDEN_PATHS.some((p) => pathname.startsWith(p))) return null;

  return (
    <nav className="bg-brand-blue sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link href="/" className="flex items-center gap-2">
            <img src={logo.src} alt="ALshowUhow" className="h-10 w-auto" />
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <LanguageSwitcher locale={locale} messages={t} onChange={applyLocale} />

            {!isHome && (
              <Link href="/" className="text-white/80 hover:text-white font-medium transition-colors">
                {t.nav.home}
              </Link>
            )}

            {status === "loading" ? (
              <span className="text-white/40 text-sm">…</span>
            ) : session ? (
              <>
                <Link href={dashboardHref} className="text-white/80 hover:text-white font-medium transition-colors">
                  {t.nav.dashboard}
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="text-white/80 hover:text-white font-medium transition-colors cursor-pointer"
                >
                  {t.nav.signOut}
                </button>
              </>
            ) : (
              <>
                {!isHome && (
                  <>
                    <Link href="/request" className="text-white/80 hover:text-white font-medium transition-colors">
                      {t.nav.needService}
                    </Link>
                    <Link href="/vendor/register" className="text-white/80 hover:text-white font-medium transition-colors">
                      {t.nav.forVendors}
                    </Link>
                  </>
                )}
                <Link href="/login" className="text-white/80 hover:text-white font-medium transition-colors">
                  {t.nav.login}
                </Link>
              </>
            )}
          </div>

          <button
            className="md:hidden p-2 text-white"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={t.nav.toggleMenu}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden pb-4 space-y-2">
            {!isHome && (
              <Link href="/" className="block px-3 py-2 text-white/80 hover:bg-white/10 rounded-lg" onClick={closeMenu}>
                {t.nav.home}
              </Link>
            )}
            {status !== "loading" && session ? (
              <>
                <Link
                  href={dashboardHref}
                  className="block px-3 py-2 text-white/80 hover:bg-white/10 rounded-lg"
                  onClick={closeMenu}
                >
                  {t.nav.dashboard}
                </Link>
                <button
                  onClick={() => {
                    closeMenu();
                    signOut({ callbackUrl: "/" });
                  }}
                  className="block w-full text-left px-3 py-2 text-white/80 hover:bg-white/10 rounded-lg cursor-pointer"
                >
                  {t.nav.signOut}
                </button>
              </>
            ) : (
              <>
                {!isHome && (
                  <>
                    <Link href="/request" className="block px-3 py-2 text-white/80 hover:bg-white/10 rounded-lg" onClick={closeMenu}>
                      {t.nav.needService}
                    </Link>
                    <Link href="/vendor/register" className="block px-3 py-2 text-white/80 hover:bg-white/10 rounded-lg" onClick={closeMenu}>
                      {t.nav.forVendors}
                    </Link>
                  </>
                )}
                <Link href="/login" className="block px-3 py-2 text-white/80 hover:bg-white/10 rounded-lg" onClick={closeMenu}>
                  {t.nav.login}
                </Link>
              </>
            )}
            {/* The desktop switcher sits in the md:flex row, which is hidden below
                md, so mobile gets its own copy rather than no way to switch. */}
            <div className="pt-2">
              <LanguageSwitcher locale={locale} messages={t} onChange={applyLocale} />
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
