import { describe, it, beforeAll, afterAll, beforeEach, expect } from "vitest";
import Fastify from "fastify";
import trackRoute from "../../src/routes/track";
import mongodb from "../../src/plugins/mongodb";
import trackerRepository from "../../src/apps/tracker/tracker.repository";
import { MongoMemoryServer } from "mongodb-memory-server";
let mongod: MongoMemoryServer;

describe("Track Route", async () => {
  let fastify: ReturnType<typeof Fastify>;
  mongod = await MongoMemoryServer.create();
  beforeAll(async () => {
    fastify = Fastify({ logger: false });
    fastify.decorate("config", {
      MONGODB_URI: mongod.getUri(),
      MONGODB_NAME: "testdb",
    });
    await fastify.register(mongodb);
    await fastify.register(trackerRepository);
    await fastify.register(trackRoute);
    await fastify.ready();
  });

  beforeEach(async () => {
    // Чистим коллекции перед каждым тестом
    await fastify.mongo.db.collection("events").deleteMany({});
  });

  afterAll(async () => {
    await fastify.close();
    await mongod.stop();
  });

  it("should store events after POST /track", async () => {
    const events = [
      {
        event: "test",
        tags: ["tag1", "tag2"],
        ts: Date.now(),
        url: "http://example.com",
        title: "Test Event",
      },
      {
        event: "test2",
        tags: ["tag3", "tag4"],
        ts: Date.now(),
        url: "http://example.com",
        title: "Test Event 2",
      },
      {
        event: "test3",
        tags: [],
        ts: Date.now(),
        url: "http://example.com",
        title: "Test Event 3",
      },
    ];

    const response = await fastify.inject({
      method: "POST",
      url: "/track",
      payload: JSON.stringify(events),
      headers: {
        "content-type": "text/plain",
      },
    });

    expect(response.statusCode).toBe(200);

    const docs = await fastify.mongo.db.collection("events").find().toArray();
    events.forEach((event, index) => {
      expect(docs[index].event).toBe(event.event);
      expect(docs[index].tags).toEqual(event.tags);
      expect(docs[index].ts).toBe(event.ts);
      expect(docs[index].url).toBe(event.url);
      expect(docs[index].title).toBe(event.title);
    });
  });

  it("should handle sendBeacon request", async () => {
    const events = [
      {
        event: "test",
        tags: ["tag1", "tag2"],
        ts: Date.now(),
        url: "http://example.com",
        title: "Test Event",
      },
      {
        event: "pagehide",
        tags: [],
        ts: Date.now(),
        url: "http://example.com",
        title: "Test Event 2",
      },
    ];
    const response = await fastify.inject({
      method: "POST",
      url: "/track",
      payload: JSON.stringify(events),
      headers: {
        "content-type": "text/plain;charset=UTF-8",
      },
    });

    expect(response.statusCode).toBe(200);
    const docs = await fastify.mongo.db.collection("events").find().toArray();
    events.forEach((event, index) => {
      expect(docs[index].event).toBe(event.event);
      expect(docs[index].tags).toEqual(event.tags);
      expect(docs[index].ts).toBe(event.ts);
      expect(docs[index].url).toBe(event.url);
      expect(docs[index].title).toBe(event.title);
    });
  });

  it("should return 422 if no events to track", async () => {
    const response = await fastify.inject({
      method: "POST",
      url: "/track",
      payload: "",
      headers: {
        "content-type": "text/plain",
      },
    });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toEqual({ message: "No events to track" });
  });

  it("should return 422 if invalid content type", async () => {
    const response = await fastify.inject({
      method: "POST",
      url: "/track",
      payload: JSON.stringify({ event: "test" }),
      headers: {
        "content-type": "application/json",
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("should return 422 if invalid payload type", async () => {
    const response = await fastify.inject({
      method: "POST",
      url: "/track",
      payload: JSON.stringify({ event: "test" }),
      headers: {
        "content-type": "text/plain",
      },
    });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toEqual({ message: "Payload must be an array" });
  });

  it("should return 422 if entity has invalid format", async () => {
    const response = await fastify.inject({
      method: "POST",
      url: "/track",
      payload: JSON.stringify([
        {
          event: "test",
          tags: "tag1,tag2", // Invalid format
          ts: Date.now(),
          url: "http://example.com",
          title: "Test Event",
        },
      ]),
      headers: {
        "content-type": "text/plain",
      },
    });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toEqual({ message: "Invalid event format" });
  });
});
