import { mount } from "cypress/react";

// `declare global { namespace Cypress { ... } }` is how Cypress augments its own
// Chainable type. It has to be a namespace declaration, so the repo-wide
// no-namespace rule is switched off for this file rather than worked around.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      mount: typeof mount;
    }
  }
}

Cypress.Commands.add("mount", mount);
