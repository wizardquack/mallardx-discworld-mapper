import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Default `node` env is fine — render.js tests pass image stubs, not real DOM.
    include: ["ui/**/*.test.js"],
  },
});
