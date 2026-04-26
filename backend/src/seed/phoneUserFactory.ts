import { prisma } from "../lib/prisma.js";
import { hashPassword } from "../lib/password.js";
import { cleanPersonName, normalizePhoneE164 } from "../lib/phone.js";

export function syntheticEmailFromPhoneE164(phoneE164: string): string {
  const digits = phoneE164.replace(/\D/g, "");
  return `p${digits}@phone.dnails.local`;
}

export type SeedUserOptions = {
  rawPhone: string;
  password: string;
  fullName: string;
};

export function resolveSeedUserOptions(overrides?: Partial<SeedUserOptions>): Required<SeedUserOptions> {
  return {
    rawPhone: (overrides?.rawPhone ?? process.env.SEED_USER_PHONE?.trim() ?? "3001234567").trim(),
    password: overrides?.password ?? process.env.SEED_USER_PASSWORD ?? "Dev123456",
    fullName: cleanPersonName(overrides?.fullName ?? process.env.SEED_USER_FULL_NAME ?? "Usuario de prueba"),
  };
}

/**
 * Crea un usuario OWNER con login por teléfono. El correo es sintético (único en BD).
 * Devuelve el usuario creado o null si ya existía (mismo teléfono o email sintético).
 */
export async function createPhoneOwnerIfAbsent(opts: SeedUserOptions) {
  if (opts.password.length < 8) {
    throw new Error("La contraseña debe tener al menos 8 caracteres");
  }
  const phoneE164 = normalizePhoneE164(opts.rawPhone);
  if (!phoneE164) {
    throw new Error(`Teléfono inválido: ${opts.rawPhone}`);
  }

  const email = syntheticEmailFromPhoneE164(phoneE164);
  const existing = await prisma.user.findFirst({
    where: { OR: [{ phoneE164 }, { email }] },
  });
  if (existing) {
    return { created: false as const, existingId: existing.id, phoneE164, email };
  }

  const owner = await prisma.role.findUnique({ where: { code: "OWNER" } });
  if (!owner) {
    throw new Error("Rol OWNER no encontrado. ¿Migraciones aplicadas?");
  }

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(opts.password),
      fullName: cleanPersonName(opts.fullName),
      phoneE164,
      roles: { create: [{ roleId: owner.id }] },
    },
  });

  return { created: true as const, user, phoneE164, email };
}
