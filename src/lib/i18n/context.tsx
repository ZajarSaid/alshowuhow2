"use client";

import { createContext, useContext } from "react";
import type { Locale, Messages } from "./config";

export type I18nValue = {
  locale: Locale;
  t: Messages;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ value, children }: { value: I18nValue; children: React.ReactNode }) {
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/**
 * Server components read the dictionary directly via `getMessages()`. This hook is
 * for client components, which cannot await cookies(). It throws rather than
 * returning null when used outside the provider, because a silently English
 * component inside a Spanish page is exactly the bug worth failing loudly on.
 *
 * There is deliberately no setter here. Changing the language means writing a
 * cookie and re-rendering the server tree, which only LanguageSwitcher does; every
 * other component just reads. Keeping the write path in one place stops two
 * components from disagreeing about what "switch language" means.
 */
export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside <I18nProvider> (see src/app/layout.tsx)");
  return value;
}
