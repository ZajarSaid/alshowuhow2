import { mount } from "cypress/react";
import CustomerRequestForm from "../../src/components/forms/CustomerRequestForm";

// Mirrors the shape `src/app/request/page.tsx` selects from the DB: the
// isCatchAll flag distinguishes the "Other" bucket from a normal category.
const categories = [
  {
    id: "home",
    name: "Home Services",
    icon: "🏡",
    description: "Plumbing, HVAC, and more",
    isCatchAll: false,
    subServices: [
      { id: "plumbing", name: "Plumbing", icon: "🔧", description: "Pipes and faucets", isCatchAll: false },
      { id: "hvac", name: "HVAC", icon: "❄️", description: "Heating and cooling", isCatchAll: false },
    ],
  },
  {
    id: "auto",
    name: "Automotive Services",
    icon: "🚗",
    description: "Repair, towing, detailing",
    isCatchAll: false,
    subServices: [{ id: "towing", name: "Towing", icon: "🚛", description: "", isCatchAll: false }],
  },
  {
    id: "other",
    name: "Other",
    icon: "📋",
    description: "Any service not listed above",
    isCatchAll: true,
    subServices: [],
  },
];

describe("<CustomerRequestForm />", () => {
  beforeEach(() => {
    mount(<CustomerRequestForm categories={categories} />);
  });

  it("renders step 1 with category selection", () => {
    cy.contains("What type of service do you need?").should("be.visible");
    cy.contains("Home Services").should("be.visible");
    cy.contains("Automotive Services").should("be.visible");
    cy.contains("Other").should("be.visible");
  });

  it("shows sub-services after picking a category", () => {
    cy.contains("button", "Home Services").click();
    cy.contains("Select a specific Home Services service").should("be.visible");
    cy.contains("button", "Plumbing").should("be.visible");
    cy.contains("button", "HVAC").should("be.visible");
  });

  it("shows progress bar", () => {
    cy.get(".rounded-full").should("exist");
  });

  it("disables Next button when no specific service is selected", () => {
    cy.contains("button", "Next").should("be.disabled");
  });

  it("keeps Next disabled after picking a category but no specific service", () => {
    cy.contains("button", "Home Services").click();
    cy.contains("button", "Next").should("be.disabled");
  });

  it("enables Next after selecting a specific service", () => {
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

describe("<CustomerRequestForm /> — catch-all (Other) category", () => {
  it("swaps the sub-service grid for a free-text box", () => {
    mount(<CustomerRequestForm categories={categories} />);
    cy.contains("button", "Other").click();
    cy.contains("What do you need?").should("be.visible");
    cy.get("#otherServiceText").should("be.visible");
    // No sub-service grid for the catch-all.
    cy.contains("Select a specific").should("not.exist");
  });

  it("keeps Next disabled until free text is entered", () => {
    mount(<CustomerRequestForm categories={categories} />);
    cy.contains("button", "Other").click();
    cy.contains("button", "Next").should("be.disabled");
    cy.get("#otherServiceText").type("Install a ceiling fan");
    cy.contains("button", "Next").should("not.be.disabled");
  });

  it("treats whitespace-only free text as invalid", () => {
    mount(<CustomerRequestForm categories={categories} />);
    cy.contains("button", "Other").click();
    cy.get("#otherServiceText").type("    ");
    cy.contains("button", "Next").should("be.disabled");
  });

  it("shows the Other-specific hint", () => {
    mount(<CustomerRequestForm categories={categories} />);
    cy.contains("button", "Other").click();
    cy.contains("Tell us what service you need in a few words.").should("be.visible");
  });

  it("caps the free text at 500 characters", () => {
    mount(<CustomerRequestForm categories={categories} />);
    cy.contains("button", "Other").click();
    cy.get("#otherServiceText").should("have.attr", "maxlength", "500");
  });

  it("advances to step 2 and back, preserving the free text", () => {
    mount(<CustomerRequestForm categories={categories} />);
    cy.contains("button", "Other").click();
    cy.get("#otherServiceText").type("Install a ceiling fan");
    cy.contains("button", "Next").click();
    cy.contains("Where is the project?").should("be.visible");
    cy.contains("button", "Back").click();
    cy.get("#otherServiceText").should("have.value", "Install a ceiling fan");
  });

  it("clears the free text when switching back to a normal category", () => {
    mount(<CustomerRequestForm categories={categories} />);
    cy.contains("button", "Other").click();
    cy.get("#otherServiceText").type("Install a ceiling fan");
    cy.contains("button", "← Change category").click();
    cy.contains("button", "Home Services").click();
    cy.contains("button", "Plumbing").click();
    cy.contains("button", "Next").click();
    cy.get("input").first().type("12345");
    cy.contains("button", "Next").click();
    cy.contains("Tell us about your project").should("be.visible");
    cy.get("textarea").first().type("Two storey house");
    cy.contains("button", "Next").click();
    cy.get("input").eq(0).type("Jane Roe");
    cy.get("input").eq(1).type("jane@example.com");
    cy.contains("button", "Next").click();
    // Review must show the chosen sub-service, not the stale free text.
    cy.contains("Review Your Request").should("be.visible");
    cy.contains("Plumbing").should("be.visible");
    cy.contains("Install a ceiling fan").should("not.exist");
  });

  it("shows the free text on the review step", () => {
    mount(<CustomerRequestForm categories={categories} />);
    cy.contains("button", "Other").click();
    cy.get("#otherServiceText").type("Install a ceiling fan");
    cy.contains("button", "Next").click();
    cy.get("input").first().type("12345");
    cy.contains("button", "Next").click();
    cy.get("textarea").first().type("Two storey house");
    cy.contains("button", "Next").click();
    cy.get("input").eq(0).type("Jane Roe");
    cy.get("input").eq(1).type("jane@example.com");
    cy.contains("button", "Next").click();
    cy.contains("Review Your Request").should("be.visible");
    cy.contains("Service you need").should("be.visible");
    cy.contains("Install a ceiling fan").should("be.visible");
  });
});

describe("<CustomerRequestForm /> — deep-link preselect", () => {
  it("preselects a normal sub-service", () => {
    mount(<CustomerRequestForm categories={categories} initialServiceId="hvac" />);
    cy.contains("Select a specific Home Services service").should("be.visible");
    cy.contains("button", "HVAC").should("have.class", "border-crimson");
    cy.contains("button", "Next").should("not.be.disabled");
  });

  it("preselects the catch-all and shows the free-text box", () => {
    mount(<CustomerRequestForm categories={categories} initialServiceId="other" />);
    cy.contains("What do you need?").should("be.visible");
    cy.get("#otherServiceText").should("be.visible");
    // No free text yet, so the step is still incomplete.
    cy.contains("button", "Next").should("be.disabled");
  });

  it("ignores an unknown service id", () => {
    mount(<CustomerRequestForm categories={categories} initialServiceId="nope" />);
    cy.contains("What type of service do you need?").should("be.visible");
    cy.contains("button", "Next").should("be.disabled");
  });
});
