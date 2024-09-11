import { defineConfig, type Options } from "tsup";

const baseOptions: Options = {
  clean: true,
  minify: false,
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
    outDir: "dist",
    format: "iife",
    globalName: "olpmtiles",
    entry: {
      "olpmtiles": "src/index.ts",
    },
    outExtension: () => {
      return { js: ".js" };
    },
  }),
];
