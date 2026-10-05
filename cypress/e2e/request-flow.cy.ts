describe("Customer Request Form", () => {
  beforeEach(() => {
    cy.visit("/request");
  });

  it("renders step 1 with category selection", () => {
    cy.contains("What type of service do you need?").should("be.visible");
    cy.contains("Home Services").should("be.visible");
    cy.contains("Automotive Services").should("be.visible");
  });

  it("shows sub-services after picking a category", () => {
    cy.contains("button", "Home Services").click();
    cy.contains("Select a specific Home Services service").should("be.visible");
    cy.contains("Plumbing").should("be.visible");
    cy.contains("HVAC").should("be.visible");
  });

  it("shows progress bar", () => {
    cy.get(".rounded-full").should("exist");
  });

  it("disables Next button when no service is selected", () => {
    cy.contains("button", "Next").should("be.disabled");
  });

  it("keeps Next disabled after picking a category but no specific service", () => {
    cy.contains("button", "Home Services").click();
    cy.contains("button", "Next").should("be.disabled");
  });

  it("enables Next after selecting a category and a specific service", () => {
    cy.contains("button", "Home Services").click();
    cy.contains("button", "Plumbing").click();
    cy.contains("button", "Next").should("not.be.disabled");
  });

  it("navigates to step 2 after selecting a service", () => {
    cy.contains("button", "Home Services").click();
    cy.contains("button", "Plumbing").click();
    cy.contains("button", "Next").click();
    cy.contains("Where is the project?").should("be.visible");
  });

  it("navigates back to step 1", () => {
    cy.contains("button", "Home Services").click();
    cy.contains("button", "Plumbing").click();
    cy.contains("button", "Next").click();
    cy.contains("Where is the project?").should("be.visible");
    cy.contains("button", "Back").click();
    cy.contains("Select a specific Home Services service").should("be.visible");
  });

  it("disables Back button on step 1", () => {
    cy.contains("button", "Back").should("be.disabled");
  });
});