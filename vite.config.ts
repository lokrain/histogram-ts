// vite.config.ts
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    plugins: [react()],
    build: {
        lib: {
            entry: path.resolve(__dirname, "src/index.ts"),
            name: "Histogram",
            formats: ["es", "cjs"],
            fileName: (format) => `histogram.${format === "es" ? "es.js" : "cjs"}`
        },
        rollupOptions: {
            external: ["react", "react-dom"],
            output: {
                globals: { react: "React", "react-dom": "ReactDOM" }
            }
        },
        sourcemap: true,
        emptyOutDir: true,
        target: "es2022"
    }
});
