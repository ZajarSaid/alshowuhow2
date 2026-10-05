describe("Homepage", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  it("renders the ALshowUhow branding", () => {
    cy.contains("AL").should("be.visible");
    cy.contains("showUhow").should("be.visible");
  });

  it("has navigation links", () => {
    cy.get('a[href="/request"]').should("exist");
    cy.get('a[href="/vendor/register"]').should("exist");
    cy.get('a[href="/login"]').should("exist");
  });

  it("navigates to the request page", () => {
    cy.get('a[href="/request"]').first().click();
    cy.url().should("include", "/request");
  });

  it("navigates to vendor registration", () => {
    cy.get('a[href="/vendor/register"]').first().click();
    cy.url().should("include", "/vendor/register");
  });

  it("navigates to login", () => {
    cy.get('a[href="/login"]').first().click();
    cy.url().should("include", "/login");
  });
});
