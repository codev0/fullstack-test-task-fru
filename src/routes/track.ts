import { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { parseJSON } from "../utils/parse-json.js";
import { TrackerEventsSchema } from "../apps/tracker/tracker.repository.js";

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

      const { data, success, error } = TrackerEventsSchema.safeParse(payload);
      if (!success) {
        fastify.log.error(error, "Invalid payload format");
        response.status(422).send({
          message: "Invalid payload format",
        });
        return;
      }

      if (data.length === 0) {
        response.status(422).send({ message: "No events to track" });
        return;
      }

      trackerRepository.createEvents(data).catch((e) => {
        fastify.log.error(e, "Error saving events");
      });

      response.header("Access-Control-Allow-Origin", request.headers.origin);
      return response.send();
    },
  );
};

export default track;
