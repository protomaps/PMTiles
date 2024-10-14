// SPDX-FileCopyrightText: 2021 Protomaps LLC
//
// SPDX-License-Identifier: BSD-3-Clause

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        mapview: resolve(__dirname, "index.html"),
        tileinspect: resolve(__dirname, "tileinspect/index.html")
      },
    },
  },
});
