import { FastifyPluginAsync } from "fastify";

const home: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/",
    {
      schema: {
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
            },
          },
        },
      },
    },
    async () => {
      return { message: "Welcome to the Fastify API!" };
    },
  );
};

export default home;
