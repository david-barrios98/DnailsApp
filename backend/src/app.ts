import Fastify from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { authPlugin } from "./plugins/auth.js";
import { registerV1Routes } from "./routes/v1.js";
import { ensureRoles } from "./seed/ensureRoles.js";

export async function buildApp() {
  const app = Fastify({
    logger: true,
    ajv: {
      customOptions: {
        coerceTypes: "array",
      },
    },
  });

  await app.register(cors, { origin: true });
  await app.register(sensible);

  await app.register(swagger, {
    openapi: {
      info: { title: "DNAILS API", version: "0.2.0" },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
    },
  });

  await app.register(swaggerUi, { routePrefix: "/docs" });

  await app.register(authPlugin);

  await ensureRoles();

  app.get(
    "/health",
    {
      schema: {
        tags: ["system"],
        summary: "Health check",
        response: { 200: { type: "object", properties: { ok: { type: "boolean" } } } },
      },
    },
    async () => ({ ok: true }),
  );

  await registerV1Routes(app);

  return app;
}
