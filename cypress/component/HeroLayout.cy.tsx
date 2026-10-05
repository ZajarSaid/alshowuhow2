import Hero from "../../src/components/sections/Hero";
import { mountWithI18n } from "../support/i18n";

// Layout of the home page hero.
//
// This replaces a spec that covered a 5-second crossfade between two slides. That
// behaviour is gone: both banners are now always on screen, with the TV show given
// the larger type and the spotlight, because a carousel meant neither banner was
// reliably seen. What these tests protect is the *replacement* - both blocks present
// at once, correct heading order, the TV block visually dominant - so that a later
// edit cannot quietly reintroduce a rotation or demote the TV show again.

const MOBILE = 375;
const DESKTOP = 1280;

// Tailwind's responsive prefixes are viewport-based, and a component test has no
// viewport, so the classes have to be matched in source rather than measured. This
// reads the built class list, which is what actually ships.
const classesOf = (subject: JQuery<HTMLElement>) => subject.attr("class") ?? "";

// Tailwind's default type scale, in px at the default 16px root. A component test
// mounts without the project's compiled stylesheet, so getComputedStyle reports the
// browser default (16px) for both headings and measuring pixels proves nothing.
// Resolving the declared classes against the scale measures the intent instead, and
// still fails if someone demotes the TV title or grows the h1 past it.
const TYPE_SCALE: Record<string, number> = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
  "4xl": 36,
  "5xl": 48,
  "6xl": 60,
  "7xl": 72,
};

/** The px size a class list renders at, at base and from the md breakpoint up. */
const declaredFontSizes = (subject: JQuery<HTMLElement>) => {
  const tokens = classesOf(subject).split(/\s+/);
  const sizes: Record<string, number> = {};
  for (const token of tokens) {
    const [, breakpoint, name] = /^((?:sm|md|lg|xl|2xl):)?text-(\w+)$/.exec(token) ?? [];
    const px = TYPE_SCALE[name ?? ""];
    if (px === undefined) continue;
    // Later rules in Tailwind's cascade win, so a larger breakpoint replaces base.
    if (breakpoint === "md" || breakpoint === "lg" || breakpoint === "xl" || breakpoint === "2xl") {
      sizes.atMd ??= px;
    } else if (!breakpoint) {
      sizes.atBase = px;
    }
  }
  // No explicit md: size means the base size still applies at md and up.
  sizes.atMd ??= sizes.atBase;
  return sizes;
};

describe("<Hero /> stacked layout", () => {
  it("shows both banners at once, with no carousel left", () => {
    mountWithI18n(<Hero />);
    cy.get("h1").should("contain.text", "Find Trusted Local Service Providers");
    cy.get("#tv-show-title").should("be.visible").and("contain.text", "ALshowUhow TV Show");

    // The rotation is gone, so its affordances must be gone too. Leaving a pause
    // button behind would imply something still moves.
    cy.get('[aria-roledescription="carousel"]').should("not.exist");
    cy.get('[aria-roledescription="slide"]').should("not.exist");
    cy.contains("button", /slide|slideshow/i).should("not.exist");
  });

  it("keeps the service line as the h1 and the TV show as an h2", () => {
    // Heading order is load-bearing: the h1 is what the page ranks for, and it has
    // to come first in the DOM for screen reader navigation to make sense.
    mountWithI18n(<Hero />);
    cy.get("h1#hero-heading").should("exist").and("contain.text", "Find Trusted Local");
    cy.get("h2#tv-show-title").should("exist");
    // Exactly one h1 on the page.
    cy.get("h1").should("have.length", 1);
  });

  it("puts the h1 before the TV heading in document order", () => {
    // The two blocks are stacked for the eye, but DOM order and visual order must
    // agree or keyboard and screen reader users get a different page.
    mountWithI18n(<Hero />);
    cy.get("h1").then(($h1) => {
      cy.get("h2#tv-show-title").then(($h2) => {
        // DOCUMENT_POSITION_FOLLOWING === 4: the node passed to
        // compareDocumentPosition comes *after* the node it is called on. So this
        // asks "does the h2 follow the h1?", which is the order we want.
        const h1PrecedesH2 = Boolean($h1[0].compareDocumentPosition($h2[0]) & 4);
        expect(h1PrecedesH2, "the h1 should precede the TV heading").to.equal(true);
      });
    });
  });

  it("sizes the TV heading above the h1, so it wins the eye", () => {
    // This is the whole point of the change: the boss wants the TV banner to be what
    // people notice. Asserted on the class list because a component test has no
    // viewport for the md: breakpoints to resolve.
    mountWithI18n(<Hero />);
    cy.get("#tv-show-title").then(($tv) => {
      const tv = classesOf($tv);
      cy.get("h1").then(($h1) => {
        // md:text-6xl (60px) on the TV title against md:text-4xl (36px) on the h1.
        expect(tv, "TV title must declare a larger md size").to.contain("md:text-6xl");
        expect(classesOf($h1), "h1 must declare a smaller md size").to.contain("md:text-4xl");
        expect(tv).to.not.contain("md:text-5xl");
      });
    });
  });

  it("biases the spotlight towards the TV block rather than the top", () => {
    // The radial highlight moved from the top of the region to 62% down, which is
    // what puts the light on the TV block. Asserted in source because the gradient
    // is an arbitrary-value class Tailwind emits verbatim.
    mountWithI18n(<Hero />);
    cy.get('[aria-hidden="true"]').should("exist");
    cy.get("section").then(($section) => {
      cy.document().then((doc) => {
        const gradients = Array.from(
          $section[0].querySelectorAll('[aria-hidden="true"] div'),
        )
          .map((el) => el.getAttribute("class") ?? "")
          .filter((cls) => cls.includes("radial-gradient"));
        expect(gradients.length, "expected radial-gradient layers").to.be.greaterThan(0);
        const biasedLow = gradients.some((cls) => /at_50%_6\d|62%/.test(cls));
        expect(biasedLow, "no gradient biased below the midpoint").to.equal(true);
      });
    });
  });

  it("keeps both call-to-action sets", () => {
    // Two links remain: one to request a service (top banner, centered) and the
    // TV sign-up (bottom banner). The vendor link is intentionally removed from
    // the hero to keep the focus on the request path.
    mountWithI18n(<Hero />);
    cy.get('a[href="/request"]').should("exist").and("contain.text", "I Need a Service");
    cy.get('a[href="/vendor/register"]').should("have.length", 1);
    cy.contains("a", "Join as a Vendor").should("not.exist");
    cy.contains("a", "Sign up and get noticed!").should("be.visible");
  });

  it("separates the two banners with a decorative divider", () => {
    mountWithI18n(<Hero />);
    // The divider marks the join between the two styles. It must stay hidden from
    // assistive technology or a screen reader announces three stray hyphens.
    cy.get('[aria-hidden="true"].flex.items-center.justify-center').should("exist");
  });

  it("names the hero region for assistive technology", () => {
    mountWithI18n(<Hero />);
    cy.get("section").should("have.attr", "aria-labelledby", "hero-heading");
    cy.get("#hero-heading").should("exist");
  });

  it("renders in Spanish with no English left in the hero", () => {
    mountWithI18n(<Hero />, "es");
    cy.get("h1").should("contain.text", "Encuentra Proveedores");
    cy.get("#tv-show-title").should("contain.text", "Programa de TV de ALshowUhow");

    const english = [
      "Find Trusted Local",
      "Tell us what you need",
      "I Need a Service",
      "Join as a Vendor",
      "ALshowUhow TV Show",
      "Get Your Business on TV!",
      "Sign up and get noticed!",
    ];
    for (const phrase of english) {
      cy.get("section").should("not.contain.text", phrase);
    }
  });

  it("keeps the longer Spanish copy inside the viewport width", () => {
    // Spanish runs roughly 15-20% longer than the English, so this is where an
    // overflow bug would show up. Desktop first, then the narrow width where the
    // stacked layout has the least room.
    mountWithI18n(<Hero />, "es");
    cy.viewport(DESKTOP, 900);
    cy.get("section").then(($section) => {
      expect($section[0].scrollWidth, "hero overflows on desktop").to.be.at.most(DESKTOP);
    });
    cy.viewport(MOBILE, 700);
    cy.get("section").then(($section) => {
      expect($section[0].scrollWidth, "hero overflows on mobile").to.be.at.most(MOBILE);
    });
  });

  it("renders the TV title larger than the h1 at every breakpoint", () => {
    // The class assertions above pin intent; this pins the result in px. Checked at
    // base and at md, because a size can be dropped at one breakpoint and kept at the
    // other - which is how a banner ends up dominant on desktop but not on a phone.
    mountWithI18n(<Hero />);
    cy.get("#tv-show-title").then(($tv) => {
      const tv = declaredFontSizes($tv);
      cy.get("h1").then(($h1) => {
        const h1 = declaredFontSizes($h1);
        expect(tv.atBase, `TV base ${tv.atBase}px vs h1 base ${h1.atBase}px`).to.be.greaterThan(
          h1.atBase!,
        );
        expect(tv.atMd, `TV md ${tv.atMd}px vs h1 md ${h1.atMd}px`).to.be.greaterThan(h1.atMd!);
        // Guard against a silent no-op: if either heading declares no type size at
        // all, the comparisons above would compare undefined and pass vacuously.
        expect(tv.atBase).to.be.a("number");
        expect(h1.atBase).to.be.a("number");
      });
    });
  });
});
