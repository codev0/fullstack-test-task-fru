import fp from "fastify-plugin";
import { MongoClient, Db } from "mongodb";
import { FastifyInstance } from "fastify";

declare module "fastify" {
  interface FastifyInstance {
    mongo: {
      client: MongoClient;
      db: Db;
    };
  }
}

const mongoPlugin = fp(async (fastify: FastifyInstance) => {
  const url = fastify.config.MONGODB_URI;
  const dbName = fastify.config.MONGODB_NAME;

  const client = new MongoClient(url);
  await client.connect();
  const db = client.db(dbName);

  fastify.decorate("mongo", { client, db });

  fastify.addHook("onClose", async () => {
    await client.close();
  });
});

export default mongoPlugin;
