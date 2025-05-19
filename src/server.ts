import Fastify from "fastify";
import fp from "fastify-plugin";

import serviceApp from "./app.js";

const app = Fastify({
  logger: { level: process.env.LOG_LEVEL ?? "silent" },
  ajv: {
    customOptions: {
      removeAdditional: "all", // remove all extra properties
    },
  },
});

async function init() {
  app.register(fp(serviceApp));

  await app.ready();

  try {
    await app.listen({ port: app.config.PORT ?? 3000 });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

init();
