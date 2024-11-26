import { defineConfig, type Options } from "tsup";

const baseOptions: Options = {
  clean: true,
  minify: true,
  skipNodeModulesBundle: true,
  sourcemap: true,
  target: "es6",
  tsconfig: "./tsconfig.json",
  keepNames: true,
  cjsInterop: true,
  splitting: true,
};

export default [
  defineConfig({
    ...baseOptions,
    entry: ["src/index.ts"],
    outDir: "dist/cjs",
    format: "cjs",
    dts: true,
  }),
  defineConfig({
    ...baseOptions,
    entry: ["src/index.ts"],
    outDir: "dist/esm",
    format: "esm",
    dts: true,
  }),
  defineConfig({
    ...baseOptions,
    esbuildOptions: (options) => {
      options.platform = "browser";
    },
    outDir: "dist",
    format: "iife",
    globalName: "pmtiles",
    entry: {
      "pmtiles": "src/index.ts",
    },
    outExtension: () => {
      return { js: ".js" };
    },
  }),
];