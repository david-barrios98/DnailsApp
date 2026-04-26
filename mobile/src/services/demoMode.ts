import type { Appointment, AuthUser } from "@/types/api";

export const DEMO_UI_TOKEN = "dnails-demo-ui";

const demoUser: AuthUser = {
  id: 0,
  email: "demo@dnails.local",
  fullName: "Modo demostración",
  phoneE164: "+573001234567",
  roles: ["OWNER"],
};

function makeDemoAppointments(): Appointment[] {
  const now = new Date();
  const iso = (d: Date) => d.toISOString();
  return [
    {
      id: 1,
      status: "CONFIRMED",
      startAt: iso(new Date(now.getTime() + 3600_000)),
      endAt: null,
      requestedStartAt: null,
      requestedTimeText: null,
      leadName: "WhatsApp",
      leadPhoneE164: "+573111111111",
      notes: "Dato de ejemplo; no requiere backend.",
      createdAt: iso(now),
      customer: { id: 1, fullName: "Ana Pérez", phoneE164: "+573201234567", email: null },
      address: {
        id: 1,
        line1: "Calle 10 # 20-30, apto 401",
        mapsUrl: "https://maps.google.com",
        neighborhood: { id: 1, locality: "Bogotá", name: "Chapinero" },
      },
      plannedServices: [
        {
          id: 1,
          quantity: 1,
          service: { id: 1, name: "Manicure semipermanente", category: { id: 1, code: "UNAS", name: "Uñas" } },
        },
      ],
    },
    {
      id: 2,
      status: "PENDING",
      startAt: null,
      endAt: null,
      requestedStartAt: null,
      requestedTimeText: "mañana tarde",
      leadName: null,
      leadPhoneE164: "+573009998877",
      notes: null,
      createdAt: iso(now),
      customer: { id: 2, fullName: "Cliente demo 2", phoneE164: null, email: "x@e.com" },
      address: null,
      plannedServices: [
        {
          id: 2,
          quantity: 2,
          service: { id: 2, name: "Depilación (zona)", category: { id: 2, code: "DEP", name: "Depilación" } },
        },
      ],
    },
  ];
}

const store = { appointments: makeDemoAppointments() };

export function getDemoUser(): AuthUser {
  return demoUser;
}

export function getDemoAppointmentsList(status?: string | null) {
  let list = [...store.appointments];
  if (status && status !== "all") {
    list = list.filter((a) => a.status === status);
  }
  return { appointments: list };
}

export function getDemoAppointment(id: number): { appointment: Appointment } | null {
  const a = store.appointments.find((x) => x.id === id);
  if (!a) return null;
  return { appointment: { ...a, plannedServices: a.plannedServices.map((p) => ({ ...p, service: { ...p.service, category: { ...p.service.category } } })) } };
}

export function patchDemoAppointment(
  id: number,
  body: Partial<{ status: string; startAt: string | null; endAt: string | null; notes: string | null }>,
): { appointment: Appointment } | null {
  const i = store.appointments.findIndex((x) => x.id === id);
  if (i < 0) return null;
  const cur = store.appointments[i]!;
  const next: Appointment = { ...cur };
  if (body.status !== undefined) next.status = body.status as Appointment["status"];
  if (body.startAt !== undefined) next.startAt = body.startAt;
  if (body.endAt !== undefined) next.endAt = body.endAt;
  if (body.notes !== undefined) next.notes = body.notes;
  store.appointments[i] = next;
  return { appointment: next };
}
