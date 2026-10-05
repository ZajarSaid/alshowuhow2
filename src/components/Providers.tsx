"use client";

import { SessionProvider } from "next-auth/react";
import type { Locale, Messages } from "@/lib/i18n/config";
import { I18nProvider } from "@/lib/i18n/context";

/**
 * The locale is resolved on the server and passed in, so the first paint is already
 * in the right language with no English flash. Nothing here mutates it - switching
 * goes through LanguageSwitcher, which writes the cookie and asks the Navbar to
 * refresh the route.
 */
export default function Providers({
  children,
  locale,
  messages,
}: {
  children: React.ReactNode;
  locale: Locale;
  messages: Messages;
}) {
  return (
    <SessionProvider>
      <I18nProvider value={{ locale, t: messages }}>{children}</I18nProvider>
    </SessionProvider>
  );
}
