import "dotenv/config";
import { $connectWithRetry } from "./lib/prisma.js";
import { buildApp } from "./app.js";

await $connectWithRetry();
const app = await buildApp();

const port = Number(process.env.PORT ?? 3333);
await app.listen({ port, host: "0.0.0.0" });

