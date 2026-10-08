import type { ReactNode } from "react";
import { createElement } from "react";
import { I18nProvider } from "@/lib/i18n/context";
import { DEFAULT_LOCALE, type Locale, type Messages } from "@/lib/i18n/config";
import en from "@/lib/i18n/dictionaries/en.json";
import es from "@/lib/i18n/dictionaries/es.json";

const DICTIONARIES: Record<Locale, Messages> = { en, es };

/**
 * Renders a component inside the i18n provider.
 *
 * Components under the layout read their copy through `useI18n()`, which throws
 * outside the provider. In the app the provider comes from the root layout, so a
 * headless test that renders one of those components directly has to supply it -
 * otherwise the tests would only pass by mocking the dictionary away, and the
 * English copy they assert would no longer be the copy the site actually renders.
 *
 * Defaults to English because that is the default locale, which keeps existing
 * suites reading naturally. Pass a locale to assert the Spanish strings.
 */
export function renderWithI18n(node: ReactNode, locale: Locale = DEFAULT_LOCALE) {
  return createElement(I18nProvider, { value: { locale, t: DICTIONARIES[locale] } }, node);
}

export { DICTIONARIES };
