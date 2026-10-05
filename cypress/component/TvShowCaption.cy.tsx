import TvShowCaption from "../../src/components/sections/TvShowCaption";
import { mountWithI18n } from "../support/i18n";

// L3 proof for the TV show caption: the fastest tiers prove the markup, this
// proves it renders in a real browser and is actually visible to a user.
describe("<TvShowCaption />", () => {
  beforeEach(() => {
    mountWithI18n(<TvShowCaption />);
  });

  it("shows the title, tagline, body and call to action", () => {
    cy.contains("ALshowUhow TV Show").should("be.visible");
    cy.contains("Get Your Business on TV!").should("be.visible");
    cy.contains("Sign up and get noticed!").should("be.visible");
  });

  it("renders the body sentence with the show name emphasised", () => {
    cy.contains("bringing vendors and businesses into the spotlight").should("be.visible");
    cy.contains("strong", "ALshowUhow TV show").should("be.visible");
    cy.contains("helping them reach a wider audience").should("be.visible");
  });

  it("stacks title, then tagline, then body, then the call to action", () => {
    // compareDocumentPosition: DOCUMENT_POSITION_FOLLOWING === 4 means the
    // second node comes after the first in document order.
    cy.contains("ALshowUhow TV Show").then(($title) => {
      cy.contains("Get Your Business on TV!").then(($tagline) => {
        cy.contains("Sign up and get noticed!").then(($cta) => {
          const follows = (a: JQuery, b: JQuery) =>
            Boolean(b[0].compareDocumentPosition(a[0]) & 4);
          // equal(true) rather than to.be.true: chai property assertions read as
          // unused expressions to the linter.
          expect(follows($tagline, $title), "tagline follows title").to.equal(true);
          expect(follows($cta, $tagline), "CTA follows tagline").to.equal(true);
        });
      });
    });
  });

  it("centres the caption text", () => {
    cy.contains("ALshowUhow TV Show")
      .parent()
      .should("have.class", "text-center");
  });

  it("links the call to action to vendor registration", () => {
    cy.contains("a", "Sign up and get noticed!")
      .should("have.attr", "href", "/vendor/register");
  });

  it("names the section for assistive technology", () => {
    cy.get('section[aria-labelledby="tv-show-title"]').should("exist");
    cy.get("#tv-show-title").should("exist");
  });

  it("does not show the copy it replaced", () => {
    cy.contains("Grow Your Business").should("not.exist");
    cy.contains("Vendor Login").should("not.exist");
  });
});
