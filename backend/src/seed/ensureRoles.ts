import type { RoleCode } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

const roles: Array<{ code: RoleCode; name: string }> = [
  { code: "OWNER", name: "Propietaria" },
  { code: "ADMIN", name: "Administración" },
  { code: "STAFF", name: "Operación" },
  { code: "VIEWER", name: "Solo lectura" },
];

export async function ensureRoles() {
  for (const r of roles) {
    await prisma.role.upsert({
      where: { code: r.code },
      update: { name: r.name },
      create: { code: r.code, name: r.name },
    });
  }
}
