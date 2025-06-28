// Build configuration for Bun
import { $ } from "bun";

export default {
    entrypoints: ["src/main.js"],
    outdir: "dist",
    target: "bun",
    format: "esm",
    splitting: false,
    minify: true,
    external: [
        // Keep these as external since they're Windows-specific
        "node-notifier",
        "fsevents"
    ],
    define: {
        "process.env.NODE_ENV": '"production"',
        "process.env.PORTABLE": '"true"'
    }
};
