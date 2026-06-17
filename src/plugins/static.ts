import fastifyStatic, { FastifyStaticOptions } from "@fastify/static";
import { FastifyInstance } from "fastify";
import fs from "node:fs";
import path from "node:path";

export const autoConfig = (fastify: FastifyInstance): FastifyStaticOptions => {
  const dirPath = path.join(
    import.meta.dirname,
    "../..",
    fastify.config.PUBLIC_DIR,
  );

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath);
  }

  return {
    root: dirPath,
    prefix: "/",
  };
};

export default fastifyStatic;
