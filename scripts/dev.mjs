import { concurrently } from "concurrently";
import { execSync } from "node:child_process";

await import("./clean.mjs");
execSync("tsc", { stdio: "inherit" });
const { result, commands } = concurrently([
  {
    command: "tsc -p tsconfig.tracker.json --watch",
    name: "Watch Tracker",
    prefixColor: "green.bold",
  },
  {
    command:
      "esbuild tracker/index.ts --bundle --format=iife --minify --outfile=public/tracker.js --target=es2017 --watch",
    name: "Build Tracker",
    prefixColor: "blue.bold",
  },
  {
    command: "tsc --watch",
    name: "Watch Server",
    prefixColor: "yellow.bold",
  },
  {
    command: "fastify start --ignore-watch=.ts$ -w -l info -P dist/app.js",
    name: "Run Server",
    prefixColor: "cyan.bold",
  },
  {
    command: "serve ./demo -p 50000",
    name: "Serve Demo",
    prefixColor: "magenta.bold",
  }
]);

result.then(
  () => {
    console.log("All commands completed successfully");
  },
  () => {
    console.error("One or more commands failed");
  }
);

process.on("SIGINT", async () => {
  console.log("shutting down all child processes gracefully, please wait...");
  await Promise.all(commands.map((cmd) => cmd.kill()));
  process.exit(0);
});
