describe("Vendor Dashboard", () => {
  beforeEach(() => {
    cy.visit("/login");
    cy.get('input[type="email"]').type("john@abcplumbing.com");
    cy.get('input[type="password"]').type("vendor123");
    cy.contains("Sign In as Vendor").click();
    cy.url({ timeout: 10000 }).should("include", "/vendor/dashboard");
  });

  it("displays the vendor dashboard", () => {
    cy.contains("Vendor Dashboard").should("be.visible");
  });

  it("displays lead statistics cards", () => {
    cy.contains("New Leads").should("be.visible");
    cy.contains("In Progress").should("be.visible");
    cy.contains("Won").should("be.visible");
    cy.contains("Total Leads").should("be.visible");
  });

  it("shows the leads section", () => {
    cy.contains("Recent Leads").should("be.visible");
  });
});
