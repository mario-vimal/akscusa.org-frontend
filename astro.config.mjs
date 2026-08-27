// @ts-check
import { defineConfig } from "astro/config";

import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://akscusa.org",
  output: "static",
  vite: {
    plugins: [tailwindcss()],
  },
});
