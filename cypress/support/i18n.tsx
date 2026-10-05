import type { ReactElement, ReactNode } from "react";
import { mount } from "cypress/react";
import { I18nProvider } from "../../src/lib/i18n/context";
import type { Locale, Messages } from "../../src/lib/i18n/config";
import en from "../../src/lib/i18n/dictionaries/en.json";
import es from "../../src/lib/i18n/dictionaries/es.json";

const DICTIONARIES: Record<Locale, Messages> = { en, es };

/**
 * Cypress mount with the i18n provider in place.
 *
 * Every component in the demo scope reads its copy through `useI18n()`, which
 * throws when there is no provider - in the app it comes from the root layout. A
 * spec that mounted one of these components bare would fail on that rather than on
 * the behaviour it exists to check, so the harness supplies the provider here
 * instead of every spec re-wrapping its own.
 *
 * Defaults to English, matching the default locale, so specs that do not care
 * about language read the same as they always have. Pass "es" to assert the
 * Spanish strings.
 */
export function mountWithI18n(node: ReactElement, locale: Locale = "en"): void {
  mount(wrap(node, locale));
}

/** The same wrapper, for specs that need to mount something other than an element. */
export function withI18n(children: ReactNode, locale: Locale = "en"): ReactElement {
  return wrap(children, locale);
}

function wrap(children: ReactNode, locale: Locale): ReactElement {
  return (
    <I18nProvider value={{ locale, t: DICTIONARIES[locale] }}>
      {children}
    </I18nProvider>
  );
}
