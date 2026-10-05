describe("Admin Dashboard", () => {
  beforeEach(() => {
    cy.visit("/login");
    cy.get('input[type="email"]').type("admin@alshowuhow.com");
    cy.get('input[type="password"]').type("admin123");
    cy.contains("button", "Administrator").click();
    cy.contains("button", "Sign In as Administrator").click();
    cy.url({ timeout: 10000 }).should("include", "/admin/dashboard");
  });

  it("displays the admin dashboard with overview stats", () => {
    cy.contains("Admin Dashboard").should("be.visible");
  });

  it("displays overview statistics cards", () => {
    cy.contains("Total Requests").should("be.visible");
    cy.contains("Active Leads").should("be.visible");
    cy.contains("Approved Vendors").should("be.visible");
  });

  it("navigates to vendors tab", () => {
    cy.contains("button", "Vendors").click();
    cy.contains("All Vendors").should("be.visible");
  });

  it("navigates to leads tab", () => {
    cy.contains("button", "Leads").click();
    cy.contains("All Leads").should("be.visible");
  });

  it("navigates to customers tab", () => {
    cy.contains("button", "Customers").click();
    cy.contains("Customers").should("be.visible");
  });

  it("navigates to services tab", () => {
    cy.contains("button", "Services").click();
    cy.contains("Service Categories").should("be.visible");
  });
});
