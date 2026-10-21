import { fileURLToPath } from "node:url";
import { transformAsync } from "@babel/core";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    {
      name: "lingui-test-macros",
      enforce: "pre",
      async transform(code, id) {
        if (
          !/\.[jt]sx?$/.test(id) ||
          id.includes("node_modules") ||
          !code.includes("/macro")
        )
          return;
        const result = await transformAsync(code, {
          filename: id,
          configFile: false,
          babelrc: false,
          parserOpts: { plugins: ["typescript", "jsx"] },
          plugins: ["@lingui/babel-plugin-lingui-macro"],
          sourceMaps: true,
        });
        return result?.code
          ? { code: result.code, map: result.map }
          : undefined;
      },
    },
  ],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["tests/**/*.test.{ts,tsx}"],
    maxWorkers: 4,
    environment: "node",
  },
});
