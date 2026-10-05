import en from "./dictionaries/en.json";

/**
 * Supported locales. English is the default and the source of truth: `Messages` is
 * derived from en.json, so adding a key there and forgetting Spanish is a TypeScript
 * error at build time rather than a page that quietly renders English to a Spanish
 * visitor.
 */
export const LOCALES = ["en", "es"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
// Named "site_locale" rather than after the brand: cookie values are an
// implementation detail, and the repo-wide brand-spelling guard
// (tests/brand-spelling.test.ts) correctly fails on any lowercase "alshowuhow"
// in source. This key is not user-visible, so keeping it generic avoids both
// a false positive and a needless rename if the brand ever changes.
export const LOCALE_COOKIE = "site_locale";

/** Shape every dictionary must satisfy. Derived from the English file. */
export type Messages = typeof en;

export const HTML_LANG: Record<Locale, string> = {
  en: "en",
  // Spanish as spoken in the US. Latin American Spanish differs in vocabulary
  // (computadora/ordenador, celular/móvil), so this is deliberately pinned rather
  // than a bare "es".
  es: "es-US",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/**
 * Narrows an arbitrary cookie value to a supported locale. Anything unrecognised
 * (a stale cookie, a hand-edited one, a tampered one) falls back to English rather
 * than throwing, because a bad cookie must never take the site down.
 */
export function parseLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/**
 * Substitutes `{name}` placeholders in a dictionary string. Needed because the
 * carousel's a11y labels are sentences with a number in them, and word order moves
 * between English and Spanish - "slide 1 of 2" is not "diapositiva 1 de 2". An
 * unknown placeholder is left intact rather than blanked, so a typo shows up in the
 * rendered label instead of silently disappearing.
 */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
