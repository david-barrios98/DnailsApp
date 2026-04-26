import { prisma } from "../lib/prisma.js";
import { createPhoneOwnerIfAbsent, resolveSeedUserOptions } from "./phoneUserFactory.js";

/**
 * Si no hay ningún usuario, crea uno con SEED_USER_* (igual que `npm run user:seed`).
 * En desarrollo (NODE_ENV distinto de production) está activo salvo que pongas AUTO_SEED_DEV_USER=0.
 * En producción solo si AUTO_SEED_DEV_USER=1 explícito.
 */
export async function ensureDefaultDevUser() {
  const f = String(process.env.AUTO_SEED_DEV_USER ?? "").toLowerCase();
  const isProd = process.env.NODE_ENV === "production";
  if (f === "0" || f === "false" || f === "no") return;
  const enabled = f === "1" || f === "true" || f === "yes" || (f === "" && !isProd);
  if (!enabled) return;

  const n = await prisma.user.count();
  if (n > 0) return;

  const r = await createPhoneOwnerIfAbsent(resolveSeedUserOptions());
  if (r.created) {
    console.log(
      `[dev] Usuario creado: ${r.phoneE164} (contraseña: SEED_USER_PASSWORD o Dev123456). Para desactivar: AUTO_SEED_DEV_USER=0 en .env`,
    );
  }
}
