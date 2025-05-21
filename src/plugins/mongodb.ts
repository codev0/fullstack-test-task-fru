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

const mongoPlugin = fp(async (fastify: FastifyInstance, opts: any) => {
  const url = fastify.config.MONGODB_URI;
  const dbName = fastify.config.MONGODB_NAME;

  const client = new MongoClient(url);
  await client.connect();
  const db = client.db(dbName);

  // Декорируем Fastify экземпляром mongo
  fastify.decorate("mongo", { client, db });

  // Закрываем соединение при завершении работы Fastify
  fastify.addHook("onClose", async () => {
    await client.close();
  });
});

export default mongoPlugin;
