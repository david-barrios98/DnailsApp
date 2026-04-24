import type { FastifyReply } from "fastify";
import type { RoleCode } from "@prisma/client";

export function hasAnyRole(userRoles: string[], allowed: RoleCode[]) {
  const allow = new Set(allowed);
  return userRoles.some((r) => allow.has(r as RoleCode));
}

export function forbidden(reply: FastifyReply) {
  return reply.code(403).send({ error: "forbidden" });
}
