import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  GOOGLE_SHEET_CSV_URL: z.string().url().optional().or(z.literal("")),
  JWT_SECRET: z.string().min(16),
  BOOTSTRAP_TOKEN: z.string().min(8),
  DEFAULT_PHONE_REGION: z.string().min(2).default("CO"),
});

export const env = EnvSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  GOOGLE_SHEET_CSV_URL: process.env.GOOGLE_SHEET_CSV_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  BOOTSTRAP_TOKEN: process.env.BOOTSTRAP_TOKEN,
  DEFAULT_PHONE_REGION: process.env.DEFAULT_PHONE_REGION,
});

