// vite.config.mjs (at project root)
import { defineConfig } from "vite";
import { nitro } from "nitro/vite";

export default defineConfig({
  root: "client", // Frontend assets live in client/
  plugins: [
    nitro({
      apiDir: "api", // API routes live in api/
    }),
  ],
});
