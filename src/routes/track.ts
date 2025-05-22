import { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { parseJSON } from "../utils/parse-json.js";
import { TrackerEvent } from "../apps/tracker/tracker.repository.js";

function isValidEvent(event: unknown): event is TrackerEvent {
  return (
    typeof event === "object" &&
    event !== null &&
    "event" in event &&
    "ts" in event &&
    "tags" in event &&
    "title" in event &&
    "url" in event &&
    Array.isArray((event as TrackerEvent).tags) &&
    typeof (event as TrackerEvent).event === "string" &&
    typeof (event as TrackerEvent).ts === "number" &&
    typeof (event as TrackerEvent).title === "string" &&
    typeof (event as TrackerEvent).url === "string"
  );
}

const track: FastifyPluginAsync = async (fastify) => {
  const { trackerRepository } = fastify;
  fastify.post(
    "/track",
    {
      schema: {
        body: {
          type: "string",
        },
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
    async (
      request: FastifyRequest<{ Body: string }>,
      response: FastifyReply,
    ) => {
      if (!request.headers["content-type"]?.includes("text/plain")) {
        response.status(422).send({ message: "Invalid content type" });
        return;
      }

      if (!request.body) {
        response.status(422).send({ message: "No events to track" });
        return;
      }

      const payload = await parseJSON(request.body);

      if (!Array.isArray(payload)) {
        response.status(422).send({ message: "Payload must be an array" });
        return;
      }

      if (payload.length === 0) {
        response.status(422).send({ message: "No events to track" });
        return;
      }

      if (!payload.every(isValidEvent)) {
        response.status(422).send({ message: "Invalid event format" });
        return;
      }

      await trackerRepository.createEvents(payload);

      response.header("Access-Control-Allow-Origin", request.headers.origin);
      response.send();
    },
  );
};

export default track;
