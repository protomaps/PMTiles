import { resolve } from "node:path";
import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [solid(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        map: resolve(__dirname, "index.html"),
        archive: resolve(__dirname, "archive/index.html"),
        tile: resolve(__dirname, "tile/index.html"),
      },
    },
  },
})
