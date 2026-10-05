import { mount } from "cypress/react";
import VendorRegistrationForm from "../../src/components/forms/VendorRegistrationForm";

describe("<VendorRegistrationForm />", () => {
  beforeEach(() => {
    mount(<VendorRegistrationForm />);
  });

  it("renders all form sections", () => {
    cy.contains("Business Information").should("be.visible");
    cy.contains("Services Offered").should("be.visible");
    cy.contains("Service Areas").should("be.visible");
    cy.contains("Qualifications").should("be.visible");
  });

  it("has required fields marked", () => {
    cy.get('input[placeholder*="Business Name"]').should("have.attr", "required");
    cy.get('input[placeholder*="John"]').should("have.attr", "required");
    cy.get('input[placeholder*="business@"]').should("have.attr", "required");
  });

  it("toggles service selection", () => {
    cy.contains("button", "Plumbing").click();
    cy.contains("button", "Plumbing").parent().should("have.class", "border-purple");

    cy.contains("button", "Plumbing").click();
    cy.contains("button", "Plumbing").parent().should("have.class", "border-gray-200");
  });

  it("allows selecting multiple services", () => {
    cy.contains("button", "Plumbing").click();
    cy.contains("button", "Electrical").click();
    cy.contains("button", "Plumbing").parent().should("have.class", "border-purple");
    cy.contains("button", "Electrical").parent().should("have.class", "border-purple");
  });

  it("renders the submit button", () => {
    cy.contains("button", "Submit Application").should("be.visible");
  });

  it("shows Terms of Service notice", () => {
    cy.contains("Terms of Service").should("be.visible");
    cy.contains("Privacy Policy").should("be.visible");
  });
});
