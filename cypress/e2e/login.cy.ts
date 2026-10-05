describe("Login Page", () => {
  beforeEach(() => {
    cy.visit("/login");
  });

  it("displays the login form", () => {
    cy.contains("Welcome Back").should("be.visible");
    cy.get('input[type="email"]').should("be.visible");
    cy.get('input[type="password"]').should("be.visible");
    cy.contains("button", "Sign In").should("be.visible");
  });

  it("shows register link", () => {
    cy.contains("Register as a vendor").should("be.visible");
    cy.get('a[href="/vendor/register"]').should("be.visible");
  });

  it("logs in as vendor and redirects to vendor dashboard", () => {
    cy.get('input[type="email"]').type("john@abcplumbing.com");
    cy.get('input[type="password"]').type("vendor123");
    cy.contains("button", "Sign In").click();
    cy.url({ timeout: 10000 }).should("include", "/vendor/dashboard");
  });

  it("logs in as admin and redirects to admin dashboard", () => {
    cy.get('input[type="email"]').type("admin@alshowuhow.com");
    cy.get('input[type="password"]').type("admin123");
    cy.contains("button", "Sign In").click();
    cy.url({ timeout: 10000 }).should("include", "/admin/dashboard");
  });

  it("routes customer accounts to homepage, not a dashboard", () => {
    cy.get('input[type="email"]').type("john@email.com");
    cy.get('input[type="password"]').type("customer123");
    cy.contains("button", "Sign In").click();
    cy.url({ timeout: 10000 }).should("match", /\/(v\w+)?$/);
    cy.url().should("not.include", "dashboard");
  });

  it("shows error for invalid credentials", () => {
    cy.get('input[type="email"]').type("wrong@email.com");
    cy.get('input[type="password"]').type("wrongpass");
    cy.contains("button", "Sign In").click();
    cy.contains("Invalid email or password").should("be.visible", { timeout: 5000 });
  });
});
