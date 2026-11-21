import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  // Relative URLs work both at a domain root and under a GitHub Pages repository path.
  base: "./",
  plugins: [react(), tailwindcss()],
  test: { environment: "jsdom", include: ["tests/**/*.test.{ts,tsx}"] },
});
