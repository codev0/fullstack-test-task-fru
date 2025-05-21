import { fileURLToPath } from "node:url";
import { dirname, join } from 'node:path'
import { FastifyInstance, FastifyPluginOptions } from "fastify";
import fastifyAutoload from "@fastify/autoload";

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default async function (
  fastify: FastifyInstance,
  opts: FastifyPluginOptions
) {
  await fastify.register(fastifyAutoload, {
    dir: join(__dirname, "plugins"),
    options: { ...opts },
  });

  await fastify.register(fastifyAutoload, {
    dir: join(__dirname, "apps"),
    options: { ...opts },
  });

  await fastify.register(fastifyAutoload, {
    dir: join(__dirname, "routes"),
    autoHooks: true,
    cascadeHooks: true,
    options: { ...opts },
  });

  fastify.setErrorHandler((error, request, reply) => {
    fastify.log.error(
      {
        error,
        request: {
          method: request.method,
          url: request.url,
          query: request.query,
          params: request.params,
        },
      },
      "Unhandled error occurred"
    );

    reply.code(error.statusCode ?? 500);

    let message = "Internal Server Error";
    if (error.statusCode && error.statusCode < 500) {
      message = error.message;
    }

    return { message };
  });

  fastify.setNotFoundHandler((request, reply) => {
    request.log.warn(
      {
        request: {
          method: request.method,
          url: request.url,
          query: request.query,
          params: request.params,
        },
      },
      "Resource not found"
    );

    reply.code(404);

    return { message: "Not Found" };
  });
}
