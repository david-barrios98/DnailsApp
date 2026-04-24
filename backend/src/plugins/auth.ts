import fp from "fastify-plugin";
import jwt from "@fastify/jwt";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { RoleCode } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { env } from "../lib/env.js";
import { forbidden, hasAnyRole } from "../lib/rbac.js";

type JwtPayload = {
  sub: number;
  roles: RoleCode[];
};

export const authPlugin = fp(async (app: FastifyInstance) => {
  await app.register(jwt, { secret: env.JWT_SECRET });

  app.decorate("authenticate", async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const payload = (await req.jwtVerify()) as JwtPayload;
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        include: { roles: { include: { role: true } } },
      });
      if (!user || user.status !== "ACTIVE") {
        return reply.code(401).send({ error: "unauthorized" });
      }

      const roles = user.roles.map((ur) => ur.role.code);
      req.user = { id: user.id, roles };
    } catch {
      return reply.code(401).send({ error: "unauthorized" });
    }
  });

  app.decorate("requireRoles", (allowed: RoleCode[]) => {
    return async (req: FastifyRequest, reply: FastifyReply) => {
      if (!req.user) return reply.code(401).send({ error: "unauthorized" });
      if (!hasAnyRole(req.user.roles as string[], allowed)) return forbidden(reply);
    };
  });
});
