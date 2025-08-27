// Build configuration for Bun + Electron + TypeScript
export default {
    entrypoints: ["src/electron/main.ts"],
    outdir: "dist",
    target: "node",
    format: "esm",
    splitting: false,
    minify: false, // Keep false for development, can be true for production
    external: [
        // Keep these as external since they're platform-specific
        "electron",
        "node-notifier",
        "fsevents"
    ],
    define: {
        "process.env.NODE_ENV": '"production"',
        "process.env.PORTABLE": '"true"'
    }
};
