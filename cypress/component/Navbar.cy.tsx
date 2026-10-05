import { mount } from "cypress/react";
import Navbar from "../../src/components/layout/Navbar";

describe("<Navbar />", () => {
  beforeEach(() => {
    mount(<Navbar />);
  });

  it("renders the ALshowUhow branding", () => {
    cy.contains("AL").should("be.visible");
    cy.contains("showUhow").should("be.visible");
  });

  it("has a link to the homepage", () => {
    cy.get('a[href="/"]').first().should("be.visible");
  });

  it("has a link to request service", () => {
    cy.get('a[href="/request"]').should("exist");
  });

  it("has a link to vendor registration", () => {
    cy.get('a[href="/vendor/register"]').should("exist");
  });

  it("has a login link", () => {
    cy.get('a[href="/login"]').should("exist");
  });
});
