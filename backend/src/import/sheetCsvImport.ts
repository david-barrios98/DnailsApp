import Papa from "papaparse";
import { env } from "../lib/env.js";
import { cleanPersonName, normalizePhoneE164 } from "../lib/phone.js";
import { prisma } from "../lib/prisma.js";
import { seedServices } from "../seed/seedServices.js";

type CsvRow = Record<string, string>;

function normalizeHeader(s: string): string {
  // Quita emojis/símbolos, acentos, y normaliza espacios para que el import no dependa
  // del encabezado exacto del Form (que incluye emojis y a veces espacios raros).
  return (s ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // diacríticos
    .replace(/[^\p{L}\p{N}]+/gu, " ") // solo letras/números -> espacios
    .trim()
    .toLowerCase();
}

function rowGetter(row: CsvRow) {
  const map = new Map<string, string>();
  for (const [k, v] of Object.entries(row)) {
    const nk = normalizeHeader(k);
    if (nk) map.set(nk, (v ?? "").trim());
  }
  const get = (...candidateHeaders: string[]) => {
    for (const h of candidateHeaders) {
      const v = map.get(normalizeHeader(h));
      if (v) return v;
    }
    return "";
  };
  return { get };
}

function stableSourceKey(row: CsvRow): string {
  // En Forms suele existir "Marca temporal" / "Timestamp". Usamos eso + teléfono.
  const { get } = rowGetter(row);
  const ts = get("Marca temporal", "Timestamp");
  const phone = normalizePhoneE164(get("Número de WhatsApp.", "Número de WhatsApp", "Numero de WhatsApp")) ?? "";
  return `${ts}|${phone}`.trim();
}

function splitMultiSelect(raw: string | undefined): string[] {
  const s = (raw ?? "").trim();
  if (!s) return [];
  // Google Forms separa por coma usualmente.
  return s.split(",").map((x) => x.trim()).filter(Boolean);
}

function normalizeServiceLabel(raw: string): string {
  // Ej: "💎 Recubrimiento acrílico → $120.000" -> "Recubrimiento acrílico"
  return raw
    .replace(/→.*$/u, "")
    .replace(/\s*[-–—]\s*\$.*$/u, "")
    .replace(/\s*\$[\d.,]+.*$/u, "")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseRequestedStartAt(dateText: string, timeText: string): Date | null {
  // dateText: "16/4/2026"
  // timeText: "7:00:00 a. m." o similar
  const d = (dateText ?? "").trim();
  const t = (timeText ?? "").trim();
  const m = d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);

  // Hora
  const tm = t.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!tm) return null;
  let hh = Number(tm[1]);
  const mm = Number(tm[2]);
  const isPM = /p/i.test(t);
  const isAM = /a/i.test(t);
  if (isPM && hh < 12) hh += 12;
  if (isAM && hh === 12) hh = 0;

  // Construimos en hora local (Bogotá)
  const dt = new Date(year, month - 1, day, hh, mm, 0, 0);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

async function upsertCustomer(fullName: string | null, phoneE164: string | null) {
  const cleanedName = cleanPersonName(fullName) || "Sin nombre";

  if (phoneE164) {
    return prisma.customer.upsert({
      where: { phoneE164 },
      update: {
        fullName: cleanedName,
      },
      create: {
        fullName: cleanedName,
        phoneE164,
      },
    });
  }

  // Sin teléfono no podemos deduplicar bien: creamos cliente suelto.
  return prisma.customer.create({
    data: { fullName: cleanedName },
  });
}

async function upsertNeighborhood(locality: string | null, neighborhood: string | null) {
  const loc = cleanPersonName(locality);
  const neigh = cleanPersonName(neighborhood);
  if (!loc || !neigh) return null;

  return prisma.neighborhood.upsert({
    where: { locality_name: { locality: loc, name: neigh } },
    update: {},
    create: { locality: loc, name: neigh },
  });
}

async function main() {
  if (!env.GOOGLE_SHEET_CSV_URL) {
    throw new Error("Falta GOOGLE_SHEET_CSV_URL en el .env");
  }

  // Semilla de servicios para que el import pueda mapear nombres -> serviceId.
  await seedServices();

  const csvText = await fetch(env.GOOGLE_SHEET_CSV_URL).then((r: Response) => {
    if (!r.ok) throw new Error(`CSV fetch failed: ${r.status}`);
    return r.text();
  });

  const parsed = Papa.parse<CsvRow>(csvText, { header: true, skipEmptyLines: true });
  if (parsed.errors.length) {
    throw new Error(`CSV parse error: ${parsed.errors[0]?.message ?? "unknown"}`);
  }

  const rows = parsed.data.filter((r: CsvRow) => Object.keys(r).length > 0);

  // Cargamos servicios para mapear por (categoryCode,name)
  const services = await prisma.service.findMany({
    where: { isActive: true },
    include: { category: true },
  });
  const serviceByKey = new Map<string, number>();
  for (const s of services) {
    serviceByKey.set(`${s.category.code}::${s.name}`.toLowerCase(), s.id);
  }

  let created = 0;
  let skipped = 0;

  for (const row of rows) {
    const key = stableSourceKey(row);
    if (!key) {
      skipped++;
      continue;
    }

    const existingSubmission = await prisma.formSubmission.findUnique({ where: { sourceKey: key } });
    if (existingSubmission) {
      // V1: no reescribimos una cita ya importada (para no pisar cambios reales).
      skipped++;
      continue;
    }

    const { get } = rowGetter(row);

    const leadName = cleanPersonName(get("¿Quién agenda?", "Quien agenda")) || null;
    const leadPhone = normalizePhoneE164(get("Número de WhatsApp.", "Número de WhatsApp", "Numero de WhatsApp")) ?? null;

    const customer = await upsertCustomer(leadName, leadPhone);

    const rawAddress =
      get("Dirección exacta", "Direccion exacta", "Dirección", "Direccion", "Ubicación", "Ubicacion") || "Pendiente por confirmar";

    const locality = get("Localidad en Bogotá", "Localidad en Bogota", "Localidad") || null;
    const barrio = get("Barrio") || null;
    const neighborhood = await upsertNeighborhood(locality, barrio);

    const address = await prisma.address.create({
      data: {
        customerId: customer.id,
        neighborhoodId: neighborhood?.id,
        line1: rawAddress,
        mapsUrl: get("Link de Google Maps", "Google Maps") || null,
      },
    });

    // Servicios (multi-select) por categoría. Los valores incluyen emoji + precio,
    // los normalizamos para que hagan match con nuestra tabla Service.
    const nails = splitMultiSelect(get("UÑAS", "Uñas", "UNAS")).map(normalizeServiceLabel);
    const wax = splitMultiSelect(get("DEPILACIÓN", "Depilación", "DEPILACION")).map(normalizeServiceLabel);
    const brows = splitMultiSelect(get("CEJAS Y PESTAÑAS", "Cejas y pestañas", "CEJAS_Y_PESTAÑAS")).map(normalizeServiceLabel);

    const plannedServiceIds: number[] = [];
    const pushIfService = (categoryCode: string, label: string) => {
      const cleaned = label.trim();
      if (!cleaned) return;
      if (/^(ninguno|no aplica)/i.test(cleaned)) return;
      const id = serviceByKey.get(`${categoryCode}::${cleaned}`.toLowerCase());
      if (id) plannedServiceIds.push(id);
    };

    for (const name of nails) pushIfService("UNAS", name);
    for (const name of wax) pushIfService("DEPILACION", name);
    for (const name of brows) pushIfService("CEJAS_Y_PESTANAS", name);

    const requestedDate = get("¿Qué día deseas el servicio?", "Que dia deseas el servicio?");
    const requestedTime = get("¿En qué horario prefieres?", "En que horario prefieres?");
    const requestedFlexText = get("¿Tienes flexibilidad de horario?", "Tienes flexibilidad de horario?");
    const requestedFlexible = requestedFlexText ? /si/i.test(requestedFlexText) : null;
    const requestedStartAt = requestedDate && requestedTime ? parseRequestedStartAt(requestedDate, requestedTime) : null;

    // startAt queda null hasta que tú confirmes en la app (depende de ruta/zonas).
    const submission = await prisma.formSubmission.create({
      data: {
        sourceKey: key,
        payload: row as any,
      },
    });

    await prisma.appointment.create({
      data: {
        customerId: customer.id,
        addressId: address.id,
        leadName,
        leadPhoneE164: leadPhone,
        status: "PENDING",
        formSubmissionId: submission.id,
        requestedStartAt,
        requestedTimeText: requestedTime || null,
        requestedFlexible,
        plannedServices: plannedServiceIds.length
          ? {
              create: plannedServiceIds.map((serviceId) => ({
                serviceId,
                quantity: 1,
              })),
            }
          : undefined,
      },
    });

    created++;
  }

  // eslint-disable-next-line no-console
  console.log({ created, skipped, total: rows.length });
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

