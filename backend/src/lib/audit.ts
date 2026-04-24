import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

export async function writeAuditLog(input: {
  actorUserId?: number | null;
  action: string;
  entity: string;
  entityId?: number | null;
  metadata?: Prisma.InputJsonValue;
  tx?: Prisma.TransactionClient;
}) {
  const db = input.tx ?? prisma;
  await db.auditLog.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      metadata: input.metadata ?? undefined,
    },
  });
}
