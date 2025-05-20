import { execSync } from "node:child_process";

await import("./build.mjs");
console.log("🔄 Starting Server 🚀");
const childProcess = execSync("fastify start -l info dist/app.js", { stdio: "inherit" });

process.on("SIGINT", () => {
    childProcess.kill("SIGINT");
    process.exit();
});
