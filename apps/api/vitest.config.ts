import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const sharedRoot = fileURLToPath(new URL("../../packages/shared/src", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@easyfinderai/shared": path.resolve(sharedRoot, "index.ts"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    env: {
      BILLING_ENABLED: "false",
    },
  },
});
