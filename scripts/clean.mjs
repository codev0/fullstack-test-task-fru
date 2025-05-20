import { rm } from "fs/promises";

try {
  await rm("dist", { recursive: true, force: true });
  console.log("dist removed");
} catch (e) {
  if (e.code !== "ENOENT") throw e; // игнорировать, если папки нет
}
