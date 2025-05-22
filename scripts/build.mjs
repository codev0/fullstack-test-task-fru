import { execSync } from "child_process";

await import("./clean.mjs");
console.log("🌐 Building Server... 🔄 ");
execSync("tsc", { stdio: "inherit" });
console.log("🌐 Sever Built ✅");

console.log("🤖 Building tracker... 🔄");
execSync("tsc -p tsconfig.tracker.json", { stdio: "inherit" });
execSync(
  "esbuild tracker/index.ts --bundle --format=iife --minify --outfile=public/tracker.js --target=es2017",
  { stdio: "inherit" },
);
console.log("🤖 Tracker Built ✅");

console.log("Build complete 🎉");
