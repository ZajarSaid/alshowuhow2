describe("Vendor Registration", () => {
  beforeEach(() => {
    cy.visit("/vendor/register");
  });

  it("displays the registration form", () => {
    cy.contains("Business Information").should("be.visible");
    cy.contains("Services Offered").should("be.visible");
    cy.contains("Service Areas").should("be.visible");
  });

  it("fills out and submits the registration form", () => {
    cy.get('input[placeholder*="Business Name"]').type("Test Plumbing Co");
    cy.get('input[placeholder*="John"]').type("John Test");
    cy.get('input[placeholder*="business@"]').type("test@plumbing.com");
    cy.get('input[placeholder*="555"]').type("(555) 999-0000");
    cy.get('input[placeholder*="123 Main"]').type("456 Test Ave, City, ST 12345");

    cy.contains("button", "Plumbing").click();
    cy.contains("button", "Electrical").click();

    cy.get("textarea").type("12345, 12346, 12347");

    cy.get('input[placeholder*="License"]').type("PL-99999");
    cy.get('input[placeholder*="Insurance"]').type("Test Insurance");
    cy.get('input[placeholder*="e.g., 5"]').type("7");
    cy.get('input[placeholder*="Password"]').type("vendorpass123");

    cy.contains("button", "Submit Application").click();
    cy.contains("Application Submitted!").should("be.visible");
    cy.contains("test@plumbing.com").should("be.visible");
  });

  it("toggles service selection on and off", () => {
    cy.contains("button", "Plumbing").click();
    cy.contains("button", "Plumbing").parent().should("have.class", "border-purple");
    cy.contains("button", "Plumbing").click();
    cy.contains("button", "Plumbing").parent().should("have.class", "border-gray-200");
  });

  it("requires business name and contact person", () => {
    cy.get('input[placeholder*="Business Name"]').should("have.attr", "required");
    cy.get('input[placeholder*="John"]').should("have.attr", "required");
  });
});
