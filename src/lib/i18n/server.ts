import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, parseLocale, type Locale, type Messages } from "./config";
import en from "./dictionaries/en.json";
import es from "./dictionaries/es.json";

const DICTIONARIES: Record<Locale, Messages> = { en, es };

/**
 * Reads the visitor's chosen locale from a cookie.
 *
 * Cookie-based rather than a `/es` URL prefix on purpose. The prefix version is the
 * right end state - it gives indexable Spanish pages and a shareable link - but it
 * means moving every route under a `[locale]` segment, which touches auth routing,
 * the admin host router, and all the tests. This is the part that can be demoed to
 * the client today and still keep the dictionaries, which is the expensive half.
 * The switcher and every `t()` call stay identical when the prefix lands.
 *
 * Server-side so the first paint is already in the right language. A client-only
 * switch would flash English before swapping, which is worse than not having it.
 */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  return parseLocale(store.get(LOCALE_COOKIE)?.value);
}

export async function getMessages(): Promise<Messages> {
  return DICTIONARIES[await getLocale()];
}

/** Re-exported so server components can import everything from one place. */
export { DEFAULT_LOCALE, LOCALE_COOKIE };
export type { Locale, Messages };
