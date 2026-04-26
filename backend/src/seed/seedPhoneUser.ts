import "dotenv/config";
import { $connectWithRetry, prisma } from "../lib/prisma.js";
import { createPhoneOwnerIfAbsent, resolveSeedUserOptions } from "./phoneUserFactory.js";
import { ensureRoles } from "./ensureRoles.js";

/** npm run user:seed — requiere que ningún otro proceso tenga la BD bloqueada. */
async function main() {
  await $connectWithRetry();
  await ensureRoles();

  const opts = resolveSeedUserOptions();
  const r = await createPhoneOwnerIfAbsent(opts);
  if (!r.created) {
    console.log("Ya existe un usuario con ese teléfono o email sintético. id=", r.existingId);
    return;
  }

  console.log("Usuario creado:", { id: r.user.id, phoneE164: r.phoneE164, fullName: r.user.fullName });
  console.log("Ingresa en la app con el teléfono y la contraseña (SEED_USER_* o valores por defecto).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
