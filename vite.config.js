import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const isElectron = process.env.BUILD_TARGET === "electron";

export default defineConfig({
  plugins: [react()],
  base: isElectron ? "./" : "/TraceLab/",
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
});
