import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  server: {
    port: 3000,
    proxy: {
      "/api": "http://localhost:4000",
    },
  },
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
});
