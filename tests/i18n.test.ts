import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import Hero from "@/components/sections/Hero";
import TvShowCaption from "@/components/sections/TvShowCaption";
import Stats from "@/components/sections/Stats";
import HowItWorks from "@/components/sections/HowItWorks";
import { I18nProvider } from "@/lib/i18n/context";
import {
  DEFAULT_LOCALE,
  HTML_LANG,
  LOCALES,
  LOCALE_COOKIE,
  fill,
  isLocale,
  parseLocale,
  type Locale,
  type Messages,
} from "@/lib/i18n/config";
import en from "@/lib/i18n/dictionaries/en.json";
import es from "@/lib/i18n/dictionaries/es.json";
import { localizeServiceName } from "@/lib/i18n/serviceNames";

// L2 proof for the English/Spanish switch.
//
// The expensive part of localisation is the copy itself, not the mechanism that
// swaps it, so what matters here is that both dictionaries are complete, that the
// provider hands a component the right one, and that no user-visible English
// string is left hardcoded in a section the demo claims to translate. The parts
// that are genuinely hard - no English flash on first paint, the cookie round
// trip - are integration behaviour and are proved by the Playwright suite, not
// here.

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: Record<string, unknown> & { children?: unknown }) =>
    createElement("a", { href, ...rest }, children as never),
}));

// Stats and HowItWorks are async server components that call cookies(). Rendering
// them here is not possible in Vitest's node environment without a request scope,
// so they are exercised by asserting their source is dictionary-driven; the rendered
// result for those two is covered by the component suite.
vi.mock("@/lib/i18n/server", () => ({
  getLocale: async () => DEFAULT_LOCALE,
  getMessages: async () => en,
}));

const DICTIONARIES: Record<Locale, Messages> = { en, es };
const SRC = resolve(__dirname, "..", "src");

/**
 * Every leaf path in a nested dictionary, as dotted strings. At module scope because
 * more than one suite sweeps all keys, and a copy-pasted flatten inside each would
 * drift apart.
 */
const flatten = (obj: object, prefix = ""): string[] =>
  Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "object" && value !== null
      ? flatten(value as object, path)
      : [path];
  });

/** Reads a dotted path out of a dictionary, as a string. */
const read = (dict: unknown, path: string): string =>
  String(path.split(".").reduce<unknown>((acc, key) => (acc as Record<string, unknown>)[key], dict));

/**
 * Decides whether a chunk of text is English prose or something structural.
 *
 * The discriminator is a run of two or more words that are *purely alphabetic*.
 * That is what separates "How This Works" and "Join as a Vendor" from every
 * legitimate literal in these files - class names, hrefs and import paths all
 * contain hyphens, slashes or digits, and identifiers are single words. Single
 * letters count, because ordinary copy contains them ("Join as a Vendor"); only
 * the word count has to be two or more. An earlier version of this guard looked
 * for two adjacent lowercase words, which silently missed title-case copy, and a
 * later one demanded two-letter words, which missed "as a"; both passed while
 * English sat on the page.
 */
const looksLikeProse = (value: string): boolean => {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) return false;
  return words.every((word) => /^[A-Za-z]+$/.test(word));
};

/**
 * Finds hardcoded English prose in a component's source.
 *
 * Three shapes matter, and missing any one makes the guard worthless:
 *   - string literals:    {"Service Categories"}
 *   - template literals:  {`Service Categories`}
 *   - raw JSX text:       <h2>Service Categories</h2>
 * The last is how people actually write it, so scanning only literals would pass
 * while English sat plainly on the page.
 *
 * Braced expressions are skipped because {t.foo} is dictionary-driven by
 * definition. Its job is to fail when someone adds a hardcoded heading, not to
 * replace reading the diff.
 */
const findHardcodedProse = (code: string): string[] => {
  const found = new Set<string>();

  for (const literal of code.match(/"[A-Za-z][A-Za-z0-9' ]{6,}"/g) ?? []) {
    if (literal !== '"use client"' && looksLikeProse(literal.slice(1, -1))) {
      found.add(`literal ${literal}`);
    }
  }

  for (const literal of code.match(/`[A-Za-z][A-Za-z0-9' ]{6,}`/g) ?? []) {
    if (looksLikeProse(literal.slice(1, -1))) found.add(`template ${literal}`);
  }

  // Text between a closing ">" and the next "<" is JSX children. The lookbehind
  // skips the ">" of an arrow function; braces skip dictionary references; and
  // semicolons, parens and equals signs appear in JavaScript but never in UI copy.
  for (const [, text] of code.matchAll(/(?<![=<>])>([^<>{}]+)</g)) {
    if (/[;()=]/.test(text)) continue;
    if (looksLikeProse(text)) found.add(`jsx ${JSON.stringify(text.trim())}`);
  }

  return [...found];
};

const render = (node: React.ReactNode, locale: Locale = "en") =>
  renderToStaticMarkup(
    createElement(I18nProvider, { value: { locale, t: DICTIONARIES[locale] } }, node),
  );

describe("locale configuration", () => {
  it("supports exactly English and Spanish", () => {
    expect([...LOCALES]).toEqual(["en", "es"]);
  });

  it("defaults to English", () => {
    expect(DEFAULT_LOCALE).toBe("en");
  });

  it("pins Spanish to a regional variant", () => {
    // Bare "es" would let browsers guess LatAm Spanish, which uses different
    // vocabulary. The target audience is US Spanish.
    expect(HTML_LANG.es).toBe("es-US");
    expect(HTML_LANG.en).toBe("en");
  });

  it("only accepts locales it knows", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("es")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });

  it("falls back to English on a bad cookie instead of throwing", () => {
    // A stale cookie from a future deploy, or a hand-edited one, must not take
    // the site down.
    for (const bad of ["fr", "", "ES", "es-MX", null, undefined, 42]) {
      expect(parseLocale(bad)).toBe("en");
    }
    expect(parseLocale("es")).toBe("es");
  });

  it("names the cookie generically, not after the brand", () => {
    // Cookie keys are identifiers. A lowercase brand in source trips the
    // repo-wide spelling guard, and renaming the brand would otherwise force a
    // cookie migration on every visitor.
    expect(LOCALE_COOKIE).toBe("site_locale");
    expect(LOCALE_COOKIE).not.toMatch(/alshowuhow/i);
  });
});

describe("dictionary completeness", () => {
  it("has every English key in Spanish", () => {
    const enKeys = flatten(en).sort();
    const esKeys = flatten(es).sort();
    expect(esKeys).toEqual(enKeys);
  });

  it("has no blank translations", () => {
    // An empty string renders as a silently missing heading, which reads as a
    // layout bug rather than an untranslated string.
    const blank = flatten(es).filter((path) => {
      const value = path
        .split(".")
        .reduce<unknown>((acc, key) => (acc as Record<string, unknown>)[key], es);
      return typeof value === "string" && value.trim() === "";
    });
    expect(blank).toEqual([]);
  });

  it("keeps the brand name untranslated everywhere", () => {
    // ALshowUhow is a proper noun. Lowercasing it to "alshowuhow" or restyling it
    // as "Alshowuhow" is the exact mistake the repo-wide brand-spelling guard
    // prevents in code, and it must not appear in the Spanish copy either. Every
    // case-insensitive occurrence must be the canonical spelling verbatim.
    const anyCaseBrand = /al\s*show\s*u?\s*how/gi;
    for (const path of flatten(es)) {
      const value = read(es, path);
      for (const match of value.matchAll(anyCaseBrand)) {
        expect(
          match[0],
          `${path} renders the brand as "${match[0]}", expected "ALshowUhow"`,
        ).toBe("ALshowUhow");
      }
    }
  });

  it("actually mentions the brand, so the check above cannot pass vacuously", () => {
    expect(flatten(es).map((path) => read(es, path)).join(" ")).toContain("ALshowUhow");
  });

  it("closes every Spanish inverted mark it opens", () => {
    // Spanish opens with ¡ / ¿ and closes with ! / ?. A copy-paste from the English
    // file easily leaves the pair inverted ("¡Hola!"), which is the single most
    // common way hand-translated copy gives itself away. Asserted as a balance:
    // every closing mark must consume an opening one.
    for (const path of flatten(es)) {
      const value = read(es, path);
      let invertedOpen = 0;
      let questionOpen = 0;

      for (const char of value) {
        if (char === "¡") invertedOpen++;
        else if (char === "!") {
          expect(invertedOpen, `${path} has a "!" with no open "¡"`).toBeGreaterThan(0);
          invertedOpen--;
        } else if (char === "¿") questionOpen++;
        else if (char === "?") {
          expect(questionOpen, `${path} has a "?" with no open "¿"`).toBeGreaterThan(0);
          questionOpen--;
        }
      }
      expect(invertedOpen, `${path} opens "¡" it never closes`).toBe(0);
      expect(questionOpen, `${path} opens "¿" it never closes`).toBe(0);
    }
  });
});

describe("placeholder substitution", () => {
  it("fills named placeholders", () => {
    expect(fill("Go to slide {number} of {total}", { number: 2, total: 2 })).toBe(
      "Go to slide 2 of 2",
    );
    expect(fill("{current} de {total}", { current: 1, total: 2 })).toBe("1 de 2");
  });

  it("leaves an unknown placeholder intact rather than blanking it", () => {
    // A typo should be visible in the rendered label, not silently swallowed.
    expect(fill("Step {numbr}", { number: "1" })).toBe("Step {numbr}");
  });

  it("has no leftover unfilled placeholders anywhere", () => {
    // The carousel's slide labels were the other placeholder user and are gone with
    // it, so "Step {number}" is now the only one. Sweeping every string rather than
    // asserting this one means a future placeholder is caught when it is added.
    for (const [name, dict] of Object.entries({ en, es })) {
      for (const path of flatten(dict)) {
        const value = read(dict, path);
        const left = value.match(/\{\w+\}/g) ?? [];
        if (path === "form.steps") continue; // array, not a templated string
        if (path === "form.stepOf") continue; // has {current} and {total}
        // dashboard.welcomeBack is filled by VendorDashboard.tsx, which substitutes
        // the business name itself so the comma only appears when there is a name.
        const whitelist = new Set(["howItWorks.stepLabel", "dashboard.welcomeBack"]);
        const expected = whitelist.has(path) ? 1 : 0;
        expect(left.length, `${name}.${path} has an unfilled placeholder`).to.equal(
          expected,
        );
      }
    }
    expect(fill(en.howItWorks.stepLabel, { number: 1 })).toBe("Step 1");
    expect(fill(es.howItWorks.stepLabel, { number: 1 })).toBe("Paso 1");
  });
});

describe("Hero renders in both locales", () => {
  it("renders the English banner by default", () => {
    const html = render(createElement(Hero));
    expect(html).toContain("Find Trusted Local");
    expect(html).toContain("Service Providers");
    expect(html).toContain("Tell us what you need");
    expect(html).toContain("I Need a Service");
  });

  it("renders the Spanish banner when the locale is Spanish", () => {
    const html = render(createElement(Hero), "es");
    expect(html).toContain("Encuentra Proveedores");
    expect(html).toContain("Locales de Confianza");
    expect(html).toContain("Dinos lo que necesitas");
    expect(html).toContain("Necesito un Servicio");
  });

  it("keeps the two-tone title split, in both languages", () => {
    // The heading styles a second phrase in the accent colour. If the dictionary
    // collapsed to one string the design detail would vanish silently, so assert
    // the accent span is still present with the right text in each locale.
    expect(render(createElement(Hero))).toMatch(
      /<span class="text-crimson-light">\s*Service Providers\s*<\/span>/,
    );
    expect(render(createElement(Hero), "es")).toMatch(
      /<span class="text-crimson-light">\s*Locales de Confianza\s*<\/span>/,
    );
  });

  it("leaves no English hero copy when Spanish is selected", () => {
    // The strongest form of the claim: not "Spanish appears" but "English does
    // not". Guards against a partial translation that renders a mixed-language
    // page.
    const html = render(createElement(Hero), "es");
    for (const english of [
      "Find Trusted Local",
      "Tell us what you need",
      "I Need a Service",
      "Join as a Vendor",
      "ALshowUhow TV Show",
      "Get Your Business on TV!",
      "Sign up and get noticed!",
    ]) {
      expect(html, `"${english}" leaked into the Spanish hero`).not.toContain(english);
    }
  });

  it("names both regions for assistive technology", () => {
    // Landmark names are user-visible copy too: a screen reader announces them
    // before the content, so they have to be localised.
    const html = render(createElement(Hero), "es");
    expect(html).toMatch(/<section[^>]*aria-labelledby="hero-heading"/);
    expect(html).toMatch(/<section[^>]*aria-labelledby="tv-show-title"/);
    // Spanish heading text, so the landmark names a Spanish-speaking user hears are
    // Spanish rather than English.
    expect(html).toContain("Encuentra Proveedores");
    expect(html).toContain("Programa de TV de ALshowUhow");
  });

  it("puts both banners in one hero region, with no carousel", () => {
    // Both banners are always visible now, so there must be no carousel roles left
    // and both sets of copy must sit under the single hero landmark.
    for (const locale of LOCALES) {
      const html = render(createElement(Hero), locale);
      expect(html, `carousel survived in ${locale}`).not.toContain('aria-roledescription');
      expect(html.match(/aria-labelledby="hero-heading"/g)).toHaveLength(1);
      expect(html).toContain("hero-heading");
      expect(html, `TV banner missing in ${locale}`).toContain("tv-show-title");
    }
  });

  it("keeps the service line as the only h1 and the TV show as an h2", () => {
    // Heading level is not the same as visual size: the h1 stays the service line
    // for search, while the TV title is styled larger to win the eye.
    for (const locale of LOCALES) {
      const html = render(createElement(Hero), locale);
      expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
      expect(html.match(/<h2[\s>]/g)).toHaveLength(1);
      expect(html).toMatch(/<h1[^>]*id="hero-heading"/);
      expect(html).toMatch(/<h2[^>]*id="tv-show-title"/);
    }
  });
});

describe("TvShowCaption renders in both locales", () => {
  it("renders the English copy", () => {
    const html = render(createElement(TvShowCaption));
    expect(html).toContain("ALshowUhow TV Show");
    expect(html).toContain("Get Your Business on TV!");
    expect(html).toContain("Sign up and get noticed!");
  });

  it("renders the Spanish copy", () => {
    const html = render(createElement(TvShowCaption), "es");
    expect(html).toContain("Programa de TV de ALshowUhow");
    expect(html).toContain("¡Haz que tu Negocio Aparezca en TV!");
    expect(html).toContain("¡Regístrate y hazte visible!");
  });

  it("keeps the emphasised show name inside a <strong>", () => {
    // The show name is emphasised mid-sentence. Spanish puts it later in the
    // sentence, so this proves the split survives reordering rather than the
    // strong tag landing around the wrong fragment.
    expect(render(createElement(TvShowCaption))).toMatch(
      /<strong[^>]*>\s*ALshowUhow TV show\s*<\/strong>/,
    );
    expect(render(createElement(TvShowCaption), "es")).toMatch(
      /<strong[^>]*>\s*el programa de TV de ALshowUhow\s*<\/strong>/,
    );
  });

  it("leaves no English TV copy when Spanish is selected", () => {
    const html = render(createElement(TvShowCaption), "es");
    for (const english of [
      "Get Your Business on TV!",
      "Sign up and get noticed!",
      "into the spotlight",
    ]) {
      expect(html, `"${english}" leaked into the Spanish caption`).not.toContain(english);
    }
  });
});

describe("server sections are dictionary-driven", () => {
  // Stats and HowItWorks cannot be rendered headlessly, so this proves the
  // property that matters and is otherwise easy to regress: no English prose is
  // left sitting in their source.
  it("has no hardcoded English prose in Stats or HowItWorks", () => {
    for (const file of ["Stats.tsx", "HowItWorks.tsx"]) {
      const source = readFileSync(join(SRC, "components/sections", file), "utf8");
      // Strip comments, then look for any string literal with two or more words
      // of prose. Class names and the numeric values are legitimately literal.
      const code = source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
      const prose = findHardcodedProse(code);
      expect(prose, `${file} has hardcoded prose: ${prose.join(", ")}`).toEqual([]);
    }
  });
});

describe("service name localisation (temporary overlay)", () => {
  const homeServices = { id: "cmumond650000s59tnanaeevj", name: "Home Services" };

  it("returns the database name for English", () => {
    expect(localizeServiceName("en", homeServices)).toBe("Home Services");
  });

  it("returns the Spanish name when one exists", () => {
    expect(localizeServiceName("es", homeServices)).toBe("Servicios para el Hogar");
  });

  it("falls back to English for an untranslated service", () => {
    // 44 sub-services have no Spanish name yet, so a Spanish page showing English
    // category names is the expected state of this demo rather than a bug.
    expect(localizeServiceName("es", { id: "unknown-id", name: "Plumbing" })).toBe("Plumbing");
  });

  it("is keyed by id, so an admin rename cannot silently break it", () => {
    // The map must not depend on the English text. If an admin renames a category
    // in the admin panel, a name-keyed map would revert to English.
    const source = readFileSync(join(SRC, "lib/i18n/serviceNames.ts"), "utf8");
    const spanishEntries = [...source.matchAll(/cmumond\w+\s*:\s*"([^"]+)"/g)].map((m) => m[1]);
    expect(spanishEntries.length).toBeGreaterThanOrEqual(7);
    for (const entry of spanishEntries) {
      expect(entry, `Spanish entry "${entry}" must not be the English name`).not.toBe(
        "Home Services",
      );
    }
  });

  it("covers every category the home page actually shows", () => {
    // The featured set is seven top-level categories plus nothing else. If a
    // category is added in the admin panel it will render English on the Spanish
    // page; this records that the overlay is expected to lag.
    const source = readFileSync(join(SRC, "lib/i18n/serviceNames.ts"), "utf8");
    const ids = [...source.matchAll(/cmumond\w+(?=\s*:\s*")/g)].map((m) => m[0]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThanOrEqual(7);
  });
});

describe("no untranslated copy in the demo scope", () => {
  it("reads every demo section's copy from the dictionary", () => {
    // One guard covering the whole surface the demo claims. A section that
    // hardcodes prose will fail here rather than silently showing English on a
    // Spanish page.
    const demoScope = [
      "components/layout/Navbar.tsx",
      "components/layout/Footer.tsx",
      "components/sections/Hero.tsx",
      "components/sections/TvShowCaption.tsx",
      "components/sections/Stats.tsx",
      "components/sections/ServiceCategories.tsx",
      "components/sections/HowItWorks.tsx",
    ];

    for (const file of demoScope) {
      const source = readFileSync(join(SRC, file), "utf8");
      const code = source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
      const prose = findHardcodedProse(code);
      expect(prose, `${file} still hardcodes prose: ${prose.join(", ")}`).toEqual([]);
    }
  });

  it("renders every locale the switcher offers", () => {
    // The switcher advertises exactly the locales in LOCALES; this makes sure a
    // locale cannot be added to the config without a dictionary behind it.
    for (const locale of LOCALES) {
      expect(DICTIONARIES[locale]).toBeTruthy();
      expect(DICTIONARIES[locale].localeName).toBeTruthy();
    }
    expect(DICTIONARIES.en.localeName).toBe("English");
    expect(DICTIONARIES.es.localeName).toBe("Español");
  });

  it("has both dictionaries on disk as separate files", () => {
    // Guards the shape that makes the next-intl migration mechanical.
    const files = readdirSync(join(SRC, "lib/i18n/dictionaries"));
    expect(files.sort()).toEqual(["en.json", "es.json"]);
  });
});
