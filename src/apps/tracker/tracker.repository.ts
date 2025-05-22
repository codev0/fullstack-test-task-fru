import { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

export type TrackerEvent = {
  event: string;
  tags: string[];
  url: string;
  title: string;
  ts: number;
};

declare module "fastify" {
  export interface FastifyInstance {
    trackerRepository: ReturnType<typeof createRepository>;
  }
}

function createRepository(fastify: FastifyInstance) {
  return {
    async createEvents(tracker: TrackerEvent[]) {
      const collection = fastify.mongo.db.collection("events");
      const result = await collection.insertMany(tracker);
      return result;
    },
  };
}

export default fp(
  async function (fastify) {
    const repo = createRepository(fastify);
    fastify.decorate("trackerRepository", repo);
  },
  {
    name: "tracker-repository",
  },
);
