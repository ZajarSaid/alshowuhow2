"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import logo from "@/logo.png";
import { useI18n } from "@/lib/i18n/context";

const HIDDEN_PATHS = ["/admin", "/vendor"];

export default function Footer() {
  const pathname = usePathname();
  const { t } = useI18n();
  if (HIDDEN_PATHS.some((p) => pathname.startsWith(p))) return null;
  return (
    <footer className="bg-brand-blue text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img src={logo.src} alt="ALshowUhow" className="h-10 w-auto" />
            </div>
            <p className="text-white/75 text-sm">{t.footer.tagline}</p>
          </div>

          <div>
            <h3 className="font-semibold mb-4">{t.footer.forCustomers}</h3>
            <ul className="space-y-2 text-sm text-white/75">
              <li><Link href="/request" className="hover:text-white transition-colors">{t.footer.requestService}</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">{t.footer.forVendors}</h3>
            <ul className="space-y-2 text-sm text-white/75">
              <li><Link href="/vendor/register" className="hover:text-white transition-colors">{t.footer.joinAsVendor}</Link></li>
              <li><Link href="/vendor/dashboard" className="hover:text-white transition-colors">{t.footer.vendorDashboard}</Link></li>
              <li><Link href="/login" className="hover:text-white transition-colors">{t.footer.login}</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/20 mt-8 pt-8 text-center text-sm text-white/75">
          {/* Brand name stays in latin script and is never translated; only the
              surrounding legal phrase changes with the locale. */}
          © {new Date().getFullYear()} ALshowUhow. {t.footer.rightsReserved}
        </div>
      </div>
    </footer>
  );
}
