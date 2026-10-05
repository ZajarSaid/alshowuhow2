import LanguageSwitcher from "../../src/lib/i18n/LanguageSwitcher";
import { LOCALE_COOKIE } from "../../src/lib/i18n/config";
import en from "../../src/lib/i18n/dictionaries/en.json";
import es from "../../src/lib/i18n/dictionaries/es.json";
import { mountWithI18n } from "../support/i18n";

// L3 proof for the language switcher.
//
// The dictionary swap is covered headlessly in tests/i18n.test.ts. What only a
// browser can prove is the part that decides whether this feels like a real
// feature or a gimmick: the cookie is actually written, with attributes that make
// the choice survive a return visit, and the callback fires exactly when it should.
//
// `router.refresh()` is not stubbed here. It lives in the Navbar, which owns the
// routing decision; the switcher only reports that a change happened. next/navigation
// is an ES module whose exports are non-configurable, so cy.stub cannot reach it
// anyway, and the Navbar-level behaviour is proved by the e2e suite.

describe("<LanguageSwitcher />", () => {
  beforeEach(() => {
    cy.clearCookies();
  });

  // The messages prop must be the *active locale's* dictionary, not always the
  // English one. Passing `en` unconditionally is exactly the bug this spec exists
  // to catch: the switcher would keep an English accessible name while marking
  // Spanish as active.
  const DICTIONARIES = { en, es } as const;

  const mountSwitcher = (locale: "en" | "es" = "en") => {
    const changes: string[] = [];
    mountWithI18n(
      <LanguageSwitcher
        locale={locale}
        messages={DICTIONARIES[locale]}
        onChange={(next) => changes.push(next)}
      />,
      locale,
    );
    return changes;
  };

  it("offers both languages regardless of the current locale", () => {
    mountSwitcher("en");
    cy.contains("button", "EN").should("be.visible");
    cy.contains("button", "ES").should("be.visible");
  });

  it("marks the active language as pressed", () => {
    // aria-pressed, not a CSS-only highlight: a screen reader must be able to
    // tell which language is live.
    mountSwitcher("en");
    cy.contains("button", "EN").should("have.attr", "aria-pressed", "true");
    cy.contains("button", "ES").should("have.attr", "aria-pressed", "false");
  });

  it("tags each option with its own lang attribute", () => {
    // Stops a screen reader pronouncing "ES" with an English voice.
    mountSwitcher("en");
    cy.contains("button", "EN").should("have.attr", "lang", "en");
    cy.contains("button", "ES").should("have.attr", "lang", "es-US");
  });

  it("labels the control for assistive technology", () => {
    mountSwitcher("es");
    cy.get('[role="group"]')
      .should("have.attr", "aria-label")
      // Spanish for "Language", proving the label is localised too.
      .and("match", /Idioma/);
  });

  it("writes the locale cookie when a language is chosen", () => {
    mountSwitcher("en");
    cy.contains("button", "ES").click();
    cy.getCookie(LOCALE_COOKIE).should("exist").and("have.property", "value", "es");
  });

  it("keeps the cookie for a year so the choice survives a return visit", () => {
    // Without an expiry the cookie dies with the browser session and the visitor
    // is asked again every time.
    mountSwitcher("en");
    cy.contains("button", "ES").click();
    cy.getCookie(LOCALE_COOKIE).should("exist");
    cy.getCookie(LOCALE_COOKIE).then((cookie) => {
      const expires = (cookie?.expiry ?? 0) * 1000;
      expect(expires, "cookie should persist well beyond a session").to.be.greaterThan(
        Date.now() + 300 * 24 * 60 * 60 * 1000,
      );
    });
  });

  it("reports the change so the page can re-render", () => {
    const changes = mountSwitcher("en");
    cy.contains("button", "ES").click();
    cy.then(() => expect(changes).to.deep.equal(["es"]));
  });

  it("does not rewrite the cookie when the active language is clicked again", () => {
    // Re-picking English while already in English must not churn the cookie or
    // ask the server to re-render for nothing.
    const changes = mountSwitcher("en");
    cy.contains("button", "EN").click();
    cy.getCookie(LOCALE_COOKIE).should("not.exist");
    cy.then(() => expect(changes, "no change to report").to.deep.equal([]));
  });

  it("is a real button, so Enter and Space activate it natively", () => {
    // Cypress `.type()` dispatches synthetic key events, which are untrusted and do
    // not trigger a button's native activation, and no cypress-real-events plugin is
    // installed here. So Enter-activation cannot be proven in this harness. What can
    // be proven, and is what actually makes keyboard use work, is that the control
    // is a native <button> rather than a styled <div>: native buttons are focusable,
    // expose a role, and respond to Enter and Space without any key handler of ours.
    mountSwitcher("en");
    cy.contains("button", "ES").should("match", "button");
    cy.contains("button", "ES").should("have.attr", "type", "button");
    // A submit button inside a form would also submit on click; this one must not.
  });

  it("takes keyboard focus", () => {
    // Read document.activeElement directly: cy.focused() and the old `be.focused`
    // chainer both yield null under component testing in this Cypress version.
    mountSwitcher("en");
    cy.contains("button", "ES").focus();
    cy.document().then((doc) => {
      expect(doc.activeElement?.textContent?.trim()).to.equal("ES");
    });
  });

  it("activates on click and persists the choice", () => {
    const changes = mountSwitcher("en");
    cy.contains("button", "ES").click();
    cy.getCookie(LOCALE_COOKIE).should("have.property", "value", "es");
    cy.then(() => expect(changes).to.deep.equal(["es"]));
  });

  it("switches back the other way", () => {
    mountSwitcher("es");
    cy.contains("button", "EN").click();
    cy.getCookie(LOCALE_COOKIE).should("have.property", "value", "en");
  });

  it("has no English accessible name when rendered for a Spanish page", () => {
    mountSwitcher("es");
    cy.contains("button", "ES").should("have.attr", "aria-pressed", "true");
    cy.get('[role="group"]').should("not.have.attr", "aria-label", "Language");
  });
});
