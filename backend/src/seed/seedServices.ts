import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

type ServiceSeed = {
  categoryCode: string;
  categoryName: string;
  name: string;
  basePrice: number;
  durationMin: number;
  durationMax: number;
};

// Duraciones "operativas" (rango) para agendamiento V1.
// Ajustables cuando tengas tiempos reales por servicio.
const services: ServiceSeed[] = [
  // UÑAS
  { categoryCode: "UNAS", categoryName: "Uñas", name: "Manos y pies tradicional", basePrice: 70000, durationMin: 90, durationMax: 150 },
  { categoryCode: "UNAS", categoryName: "Uñas", name: "Semipermanente manos", basePrice: 65000, durationMin: 90, durationMax: 150 },
  { categoryCode: "UNAS", categoryName: "Uñas", name: "Semipermanente pies", basePrice: 75000, durationMin: 60, durationMax: 120 },
  { categoryCode: "UNAS", categoryName: "Uñas", name: "Dipping", basePrice: 100000, durationMin: 150, durationMax: 240 },
  { categoryCode: "UNAS", categoryName: "Uñas", name: "Recubrimiento acrílico", basePrice: 120000, durationMin: 180, durationMax: 240 },
  { categoryCode: "UNAS", categoryName: "Uñas", name: "Acrílico completo", basePrice: 160000, durationMin: 210, durationMax: 300 },
  { categoryCode: "UNAS", categoryName: "Uñas", name: "Press On", basePrice: 120000, durationMin: 90, durationMax: 180 },

  // DEPILACIÓN
  { categoryCode: "DEPILACION", categoryName: "Depilación", name: "Cejas", basePrice: 25000, durationMin: 20, durationMax: 45 },
  { categoryCode: "DEPILACION", categoryName: "Depilación", name: "Bigote / Barbilla", basePrice: 17000, durationMin: 15, durationMax: 35 },
  { categoryCode: "DEPILACION", categoryName: "Depilación", name: "Axila", basePrice: 25000, durationMin: 15, durationMax: 40 },
  { categoryCode: "DEPILACION", categoryName: "Depilación", name: "Media pierna", basePrice: 35000, durationMin: 30, durationMax: 60 },
  { categoryCode: "DEPILACION", categoryName: "Depilación", name: "Pierna completa", basePrice: 45000, durationMin: 45, durationMax: 80 },
  { categoryCode: "DEPILACION", categoryName: "Depilación", name: "Brazos", basePrice: 40000, durationMin: 35, durationMax: 70 },
  { categoryCode: "DEPILACION", categoryName: "Depilación", name: "Bikini parcial", basePrice: 35000, durationMin: 20, durationMax: 45 },
  { categoryCode: "DEPILACION", categoryName: "Depilación", name: "Bikini completo", basePrice: 45000, durationMin: 30, durationMax: 60 },

  // CEJAS Y PESTAÑAS
  { categoryCode: "CEJAS_Y_PESTANAS", categoryName: "Cejas y pestañas", name: "Lifting pestañas", basePrice: 100000, durationMin: 60, durationMax: 120 },
  { categoryCode: "CEJAS_Y_PESTANAS", categoryName: "Cejas y pestañas", name: "Laminado cejas", basePrice: 50000, durationMin: 45, durationMax: 90 },
  { categoryCode: "CEJAS_Y_PESTANAS", categoryName: "Cejas y pestañas", name: "Diseño con henna", basePrice: 40000, durationMin: 30, durationMax: 75 },
];

export async function seedServices() {
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    for (const s of services) {
      const category = await tx.serviceCategory.upsert({
        where: { code: s.categoryCode },
        update: { name: s.categoryName },
        create: { code: s.categoryCode, name: s.categoryName },
      });

      const service = await tx.service.upsert({
        where: { categoryId_name: { categoryId: category.id, name: s.name } },
        update: {
          durationMin: s.durationMin,
          durationMax: s.durationMax,
          isActive: true,
        },
        create: {
          categoryId: category.id,
          name: s.name,
          durationMin: s.durationMin,
          durationMax: s.durationMax,
          isActive: true,
        },
      });

      const current = await tx.servicePrice.findFirst({
        where: { serviceId: service.id, effectiveTo: null },
        orderBy: { effectiveFrom: "desc" },
      });

      if (!current || current.amountCOP !== s.basePrice) {
        if (current) {
          await tx.servicePrice.update({
            where: { id: current.id },
            data: { effectiveTo: new Date() },
          });
        }

        await tx.servicePrice.create({
          data: {
            serviceId: service.id,
            amountCOP: s.basePrice,
            currency: "COP",
            effectiveFrom: new Date(),
          },
        });
      }
    }
  });
}

