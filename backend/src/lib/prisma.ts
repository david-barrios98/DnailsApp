import "dotenv/config";
import { PrismaClient } from "@prisma/client";

/**
 * No añadimos `?connection_limit=1` a la URL: en Windows Prisma/Studio a veces tratan la ruta
 * como un nombre de archivo literal con `?` (base errónea y más bloqueos).
 */
export const prisma = new PrismaClient();

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Conexión con reintento: SQLite a veces reporta "locked" al arrancar varias instancias o con WAL huérfano. */
export async function $connectWithRetry(attempts = 10): Promise<void> {
  for (let i = 1; i <= attempts; i++) {
    try {
      await prisma.$connect();
      return;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const retryable = /locked|busy|timeout|P1008|P2010|sqlite/i.test(msg);
      if (i === attempts || !retryable) {
        const hint =
          retryable
            ? " Cierra otras consolas (npm run dev, Prisma Studio), elimina en prisma/ los archivos dev2.db-wal y dev2.db-shm, y reintenta."
            : "";
        throw new Error(`${msg}${hint}`);
      }
      await sleep(400 * i);
    }
  }
}

