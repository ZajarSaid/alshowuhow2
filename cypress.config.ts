import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:3000",
    setupNodeEvents() {},
    specPattern: "cypress/e2e/**/*.cy.{js,ts}",
  },
  component: {
    devServer: {
      framework: "next",
      bundler: "webpack",
    },
    specPattern: "cypress/component/**/*.cy.{js,ts,tsx}",
  },
});
