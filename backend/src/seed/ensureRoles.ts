import type { RoleCode } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

function prismaErrorCode(e: unknown): string | undefined {
  if (typeof e === "object" && e !== null && "code" in e && typeof (e as { code: unknown }).code === "string") {
    return (e as { code: string }).code;
  }
  return undefined;
}

const roles: Array<{ code: RoleCode; name: string }> = [
  { code: "OWNER", name: "Propietaria" },
  { code: "ADMIN", name: "Administración" },
  { code: "STAFF", name: "Operación" },
  { code: "VIEWER", name: "Solo lectura" },
];

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function ensureRoles() {
  const max = 5;
  for (let attempt = 1; attempt <= max; attempt++) {
    try {
      for (const r of roles) {
        await prisma.role.upsert({
          where: { code: r.code },
          update: { name: r.name },
          create: { code: r.code, name: r.name },
        });
      }
      return;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const code = prismaErrorCode(e);
      const isLock =
        code === "P1008" ||
        code === "P1017" ||
        msg.toLowerCase().includes("database is locked") ||
        msg.toLowerCase().includes("sqlite_busy");
      if (isLock && attempt < max) {
        await sleep(600 * attempt);
        continue;
      }
      if (isLock) {
        const hint =
          "Cierra otras consolas (npm run dev, Prisma Studio), o elimina dev2.db-wal y dev2.db-shm en prisma/ si el proceso colgó. Proyecto fuera de OneDrive mejora bloqueos en Windows.";
        throw new Error(`${msg} — ${hint}`);
      }
      throw e;
    }
  }
}
