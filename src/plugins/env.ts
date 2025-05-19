import env from "@fastify/env";

declare module "fastify" {
  export interface FastifyInstance {
    config: {
      PORT: number;
      LOG_LEVEL: string;
      PUBLIC_DIR: string;
    };
  }
}

const schema = {
  type: "object",
  required: ["PORT"],
  properties: {
    PORT: {
      type: "number",
      default: 8888,
    },
    LOG_LEVEL: {
      type: "string",
      enum: ["info", "warn", "error"],
      default: "info",
    },
    PUBLIC_DIR: {
      type: "string",
      minLength: 1,
      pattern: "^(?!.*\\.{2}).*$",
      default: "public",
    },
  },
};

export const autoConfig = {
  configKey: "config",
  schema,
  dotenv: true,
  data: process.env,
};

export default env;
