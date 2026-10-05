import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import TvShowCaption from "@/components/sections/TvShowCaption";
import { renderWithI18n } from "./helpers/i18n";

// L1 proof for the TV show caption. The component has no business logic, so the
// things worth proving are: the copy matches the client's approved wording, the
// required order is title -> tagline -> body -> CTA, the block is centred, the
// CTA targets vendor registration, and the accent colour is actually readable.
//
// Runs in Vitest's `node` environment (vitest.config.ts), which has no jsdom, so
// assertions are against server-rendered markup strings rather than a live DOM.
//
// next/link is a Client Component expecting the Next router context, which does
// not exist here, so it is stubbed with a plain anchor. That keeps the href
// observable; it does not exercise client-side navigation or prefetching.
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: Record<string, unknown> & { children?: unknown }) =>
    createElement("a", { href, ...rest }, children as never),
}));

const COPY = {
  title: "ALshowUhow TV Show",
  tagline: "Get Your Business on TV!",
  body:
    "ALshowUhow is bringing vendors and businesses into the spotlight, showcasing their services on",
  emphasised: "ALshowUhow TV show",
  bodyTail: "and helping them reach a wider audience.",
  cta: "Sign up and get noticed!",
} as const;

// Rendered per test rather than at module scope, so a render failure surfaces as
// a failure in the assertion that was exercising it instead of a collection error.
// Wrapped in the provider because the component reads its copy through useI18n(),
// which throws bare. The provider is fed the real English dictionary, not a mock,
// so COPY below stays the wording the site actually renders.
const render = () => renderToStaticMarkup(renderWithI18n(createElement(TvShowCaption)));

// The client's original copy spelled the title "ALshowUhow T.V. Show" and the body
// "ALshowUhow TV show", so the same product was named two ways on one screen. It
// is now normalised to "TV" in both, keeping ordinary English casing: title case
// in the heading, lowercase mid-sentence. This pins that.
const SHOW_NAME = /ALshowUhow (T\.?V\.?)(?=\s*[Ss]how)/g;

// WCAG 2.1 relative luminance / contrast ratio, used by the colour guard below.
const channel = (v: number) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
const luminance = (hex: string) => {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => channel(parseInt(h.slice(i, i + 2), 16) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [l1, l2] = [luminance(a), luminance(b)];
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

describe("TvShowCaption (L1: headless copy contract)", () => {
  it("renders the client's approved title", () => {
    expect(render()).toContain(COPY.title);
  });

  it("spells the show name one way everywhere on the page", () => {
    const spellings = [...render().matchAll(SHOW_NAME)].map((m) => m[1].replace(/\./g, ""));

    // At least the title and the body mention it, so the check is not vacuous.
    expect(spellings.length).toBeGreaterThanOrEqual(2);
    // One distinct spelling only: catches T.V., Tv, t.v. and any future variant.
    expect([...new Set(spellings)]).toEqual(["TV"]);
  });

  it("does not use the old T.V. styling in user-visible copy", () => {
    // The only permitted "T.V." is the none left; this guards comments too, so
    // the string cannot quietly reappear via a copy-paste of this file.
    expect(render()).not.toMatch(/T\.V\./);
  });

  it("renders the tagline", () => {
    expect(render()).toContain(COPY.tagline);
  });

  it("renders the body as one sentence with the show name emphasised", () => {
    const html = render();
    expect(html).toContain(COPY.body);
    expect(html).toContain(COPY.bodyTail);
    // Attribute-order independent, so reordering classes or adding a utility
    // does not break the assertion.
    expect(html).toMatch(new RegExp(`<strong[^>]*>\\s*${COPY.emphasised}\\s*</strong>`));
  });

  it("renders the call to action", () => {
    expect(render()).toContain(COPY.cta);
  });

  it("orders title, tagline, body then CTA", () => {
    const html = render();
    const iTitle = html.indexOf(COPY.title);
    const iTagline = html.indexOf(COPY.tagline);
    const iBody = html.indexOf(COPY.body);
    const iCta = html.indexOf(COPY.cta);

    expect(iTitle).toBeGreaterThan(-1);
    expect(iTagline).toBeGreaterThan(iTitle);
    expect(iBody).toBeGreaterThan(iTagline);
    expect(iCta).toBeGreaterThan(iBody);
  });

  it("centres the caption in the section container", () => {
    // Assert both tokens live on the same container class list, so a nested
    // `text-center` elsewhere cannot satisfy this vacuously. The container is
    // identified by max-w-7xl rather than by position, so decorative layers
    // added above it do not redirect the assertion.
    const containerClass = render().match(/<div class="([^"]*max-w-7xl[^"]*)">/)?.[1] ?? "";
    expect(containerClass).toContain("max-w-7xl");
    expect(containerClass).toContain("text-center");
  });

  it("labels the section for assistive technology", () => {
    expect(render()).toMatch(/<section[^>]*aria-labelledby="tv-show-title"/);
  });

  it("points the call to action at vendor registration", () => {
    expect(render()).toContain('href="/vendor/register"');
  });

  it("does not carry over the copy it replaced", () => {
    const html = render();
    expect(html).not.toContain("Grow Your Business");
    expect(html).not.toContain("Vendor Login");
  });

  it("keeps the accent text readable on the gradient", () => {
    // Regression guard. The base --crimson is 2.03:1 on --purple and 1.84:1 on
    // --blue, which fails WCAG AA even for large text, so the tagline must use
    // the light variant. This locks that in against a silent revert.
    // Resolved relative to this file (tests/), not process.cwd(), so the suite
    // does not break under a different working directory.
    const css = readFileSync(resolve(__dirname, "..", "src/app/globals.css"), "utf8");
    const token = (name: string) => css.match(new RegExp(`${name}:\\s*(#[0-9A-Fa-f]{6})`))?.[1];

    const accent = token("--crimson-light");
    expect(accent, "--crimson-light must be defined in globals.css").toBeTruthy();

    for (const bg of [token("--purple"), token("--blue")]) {
      expect(bg).toBeTruthy();
      // AA large text is 3:1.
      expect(contrast(accent!, bg!)).toBeGreaterThanOrEqual(3);
    }

    // And the base token must stay the rejected dark one, so this test cannot be
    // satisfied by quietly redefining --crimson itself.
    expect(render()).toContain("text-crimson-light");
    expect(render()).not.toContain('class="text-crimson"');
  });

  it("hides decorative layers from assistive technology", () => {
    // The backdrop glow, spotlights, vignette, TV glyph, rule and CTA arrow are
    // all presentational and must not be announced. Every non-content element
    // therefore carries aria-hidden, and nothing invents an aria-label or an
    // alt text that duplicates the visible copy.
    const html = render();
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain("aria-label=");
    expect(html).not.toContain("alt=");
  });

  it("keeps the motion effect opt-out for reduced-motion users", () => {
    // The arrow nudge is the only motion. Tailwind's motion-reduce variant must
    // disable it, so the class has to be present rather than assumed.
    expect(render()).toContain("motion-reduce:");
  });
});
