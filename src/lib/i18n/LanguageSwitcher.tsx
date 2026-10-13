"use client";

import { LOCALE_COOKIE, LOCALES, type Locale, type Messages } from "./config";

const SHORT_LABELS: Record<Locale, string> = { en: "English", es: "Spanish" };

/**
 * Language switcher.
 *
 * Two responsibilities, deliberately split: this component persists the choice and
 * reports it, and the container decides what "apply it" means. The Navbar passes
 * `router.refresh()` as `onChange`; keeping that decision outside means the
 * switcher itself mounts and is testable without an App Router instance, which
 * `useRouter` would otherwise require.
 *
 * Rendered as two buttons rather than a <select> so both languages are reachable
 * by keyboard and visible at a glance, which a collapsed dropdown hides from
 * anyone not already looking for it.
 */
export default function LanguageSwitcher({
  locale,
  messages,
  onChange,
}: {
  locale: Locale;
  messages: Pick<Messages, "nav">;
  /** Called after the cookie is written. Omitted in tests that only assert storage. */
  onChange?: (locale: Locale) => void;
}) {
  function choose(next: Locale) {
    // Re-picking the language already active would rewrite the cookie and trigger a
    // pointless server re-render, so this is a no-op.
    if (next === locale) return;

    // SameSite=Lax so the cookie is sent with the app's own requests. One year is
    // long enough that a returning visitor is not asked again, short enough that
    // changing the default locale eventually reaches people.
    //
    // The immutability rule below is a false positive: it reads this as mutating a
    // value owned by an outer scope, but `document.cookie` is a write to the browser's
    // cookie jar, not to any React value. Writing it here rather than in an effect is
    // deliberate - the switcher has no server round trip, and an effect would render
    // once with the stale locale before correcting.
    // eslint-disable-next-line react-hooks/immutability
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    onChange?.(next);
  }

  return (
    <div
      role="group"
      aria-label={messages.nav.languageLabel}
      className="inline-flex items-center rounded-full bg-white/10 p-0.5 ring-1 ring-inset ring-white/20"
    >
      {LOCALES.map((code) => {
        const active = code === locale;
        return (
          <button
            key={code}
            type="button"
            onClick={() => choose(code)}
            // aria-pressed, not aria-selected: these are buttons that toggle a
            // setting, and the active one must be announced as pressed.
            aria-pressed={active}
            lang={code === "es" ? "es-US" : "en"}
            title={code === "es" ? "Español" : "English"}
            className={
              active
                ? "px-2.5 py-1 rounded-full text-xs font-bold text-brand-blue bg-white transition-colors"
                : "px-2.5 py-1 rounded-full text-xs font-bold text-white/70 hover:text-white transition-colors"
            }
          >
            {SHORT_LABELS[code]}
          </button>
        );
      })}
    </div>
  );
}
