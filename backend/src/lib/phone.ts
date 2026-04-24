import { env } from "./env.js";

function onlyDigits(input: string): string {
  return input.replace(/\D/g, "");
}

/**
 * Normaliza a E.164 lo más posible.
 * - Si ya viene con `+`, lo conserva (si parece válido).
 * - Si viene como número local CO (10 dígitos), antepone +57.
 */
export function normalizePhoneE164(raw: string | undefined | null, defaultRegion: string = env.DEFAULT_PHONE_REGION): string | null {
  const s = (raw ?? "").trim();
  if (!s) return null;

  if (s.startsWith("+")) {
    const digits = onlyDigits(s.slice(1));
    if (digits.length < 8 || digits.length > 15) return null;
    return `+${digits}`;
  }

  const digits = onlyDigits(s);
  if (!digits) return null;

  if (defaultRegion === "CO") {
    if (digits.length === 10) return `+57${digits}`;
    if (digits.length === 12 && digits.startsWith("57")) return `+${digits}`;
  }

  // fallback: intentamos tratarlo como E.164 sin prefijo explícito
  if (digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  return null;
}

export function normalizeEmail(raw: string | undefined | null): string | null {
  const s = (raw ?? "").trim().toLowerCase();
  if (!s) return null;
  return s;
}

export function cleanPersonName(raw: string | undefined | null): string {
  return (raw ?? "")
    .trim()
    .replace(/\s+/g, " ");
}
