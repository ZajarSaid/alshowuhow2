import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import Home from "@/app/page";
import { renderWithI18n } from "./helpers/i18n";

// L2 proof for the home page section swap: the TV show caption sits in the same
// hero as the "Find Trusted Local Service Providers" banner, stacked below it.
//
// The database-backed siblings are stubbed. ServiceCategories is async and reads
// from the database, which would make this suite non-hermetic and would query
// whatever DATABASE_URL is present; stubbing them isolates the thing under test,
// which is which section Home composes. Hero is deliberately NOT stubbed - the
// two banners sharing one hero is now the thing being proved, so stubbing it would
// render the TV copy unreachable and make the assertions vacuous.

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: Record<string, unknown> & { children?: unknown }) =>
    createElement("a", { href, ...rest }, children as never),
}));

vi.mock("@/components/sections/Stats", () => ({
  default: () => createElement("div", null, "stats-stub"),
}));
vi.mock("@/components/sections/ServiceCategories", () => ({
  default: () => createElement("div", null, "categories-stub"),
}));
vi.mock("@/components/sections/HowItWorks", () => ({
  default: () => createElement("div", null, "howitworks-stub"),
}));

const ROOT = resolve(__dirname, "..");
// Hero is a Client Component that reads its copy through useI18n(), so it needs the
// provider the root layout normally supplies. English, because the assertions below
// pin the English wording.
const html = () => renderToStaticMarkup(renderWithI18n(createElement(Home)));

describe("home page section composition (L2: swap is wired in)", () => {
  it("renders the TV show caption", () => {
    expect(html()).toContain("ALshowUhow TV Show");
    expect(html()).toContain("Get Your Business on TV!");
    expect(html()).toContain("Sign up and get noticed!");
  });

  it("keeps both banners inside the same hero region", () => {
    // The requirement was for the two banners to share one region, not to sit as
    // separate stacked sections. Both copies must therefore live under a single
    // section, and that section is named by the service h1.
    const markup = html();
    const hero = markup.match(/<section[^>]*aria-labelledby="hero-heading"[\s\S]*?<\/section>/);
    expect(hero, "no hero region found on the home page").not.toBeNull();
    expect(hero![0]).toContain("Find Trusted Local");
    expect(hero![0]).toContain("ALshowUhow TV Show");
    expect(markup.match(/aria-labelledby="hero-heading"/g)).toHaveLength(1);
  });

  it("has no carousel left, and neither do its controls", () => {
    // The rotation was removed so both banners are always visible. If any part of
    // the carousel survived, the page would imply something still moves.
    const markup = html();
    expect(markup).not.toContain('aria-roledescription="carousel"');
    expect(markup).not.toContain('aria-roledescription="slide"');
    expect(markup).not.toContain("Pause slideshow");
    expect(markup).not.toContain("Go to slide");
  });

  it("renders every other home page section", () => {
    const markup = html();
    for (const marker of ["stats-stub", "categories-stub", "howitworks-stub"]) {
      expect(markup).toContain(marker);
    }
  });

  it("no longer renders the replaced banner", () => {
    const markup = html();
    expect(markup).not.toContain("Grow Your Business");
    expect(markup).not.toContain("Vendor Login");
    // "Join as a Vendor" used to appear twice (hero CTA + the old VendorCTA
    // banner). The hero CTA has been removed, and the VendorCTA module is gone, so
    // the wording must not appear at all on the home page now.
    expect(markup.match(/Join as a Vendor/g)).toBeNull();
  });

  it("has deleted the VendorCTA module", () => {
    expect(existsSync(resolve(ROOT, "src/components/sections/VendorCTA.tsx"))).toBe(false);
  });

  it("has no dangling reference to VendorCTA", () => {
    // This is the assertion that makes the leaf-component guard meaningful: a
    // leftover import would silently keep the old copy live in production.
    const page = readFileSync(resolve(ROOT, "src/app/page.tsx"), "utf8");
    expect(page).not.toContain("VendorCTA");
    // TvShowCaption is composed by Hero now, so page.tsx must not also mount it
    // directly or the banner would render twice.
    expect(page).not.toContain("TvShowCaption");
    expect(readFileSync(resolve(ROOT, "src/components/sections/Hero.tsx"), "utf8")).toContain(
      "TvShowCaption",
    );
  });

  it("keeps /login reachable now that VendorCTA's login button is gone", () => {
    // VendorCTA carried a /login link. Navbar and Footer supply it globally, so
    // replacing the section must not remove the only way in for existing
    // vendors. Navbar/Footer are layout chrome, not this page's markup, so the
    // assertion is made against their sources.
    for (const file of ["src/components/layout/Navbar.tsx", "src/components/layout/Footer.tsx"]) {
      expect(readFileSync(resolve(ROOT, file), "utf8")).toContain('href="/login"');
    }
  });

  it("does not reference missing image assets", () => {
    // Hero referenced /grid.svg via bg-[url(...)], but public/grid.svg does not
    // exist, so every page load 404'd. Any public asset referenced from a
    // component must actually be there.
    const sections = readdirSync(resolve(ROOT, "src/components/sections"));
    const layout = readdirSync(resolve(ROOT, "src/components/layout"));

    for (const [dir, files] of [
      ["src/components/sections", sections],
      ["src/components/layout", layout],
    ] as const) {
      for (const file of files) {
        const source = readFileSync(resolve(ROOT, dir, file), "utf8");
        for (const match of source.matchAll(/url\(['"]?\/([^'")]+)['"]?\)/g)) {
          const asset = match[1];
          expect(
            existsSync(resolve(ROOT, "public", asset)),
            `${file} references /${asset}, which is missing from public/`,
          ).toBe(true);
        }
      }
    }
  });
});
