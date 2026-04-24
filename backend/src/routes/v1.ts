import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppointmentStatus, PaymentMethod, Prisma, RoleCode } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { env } from "../lib/env.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { writeAuditLog } from "../lib/audit.js";
import { cleanPersonName, normalizeEmail, normalizePhoneE164 } from "../lib/phone.js";
import { seedServices } from "../seed/seedServices.js";

const VIEW = ["OWNER", "ADMIN", "STAFF", "VIEWER"] as const satisfies readonly RoleCode[];
const OPS = ["OWNER", "ADMIN", "STAFF"] as const satisfies readonly RoleCode[];
const ADMIN = ["OWNER", "ADMIN"] as const satisfies readonly RoleCode[];

export async function registerV1Routes(app: FastifyInstance) {
  app.register(async (v1) => {
    // --- Auth (público) ---
    v1.post(
      "/auth/bootstrap",
      {
        schema: {
          tags: ["auth"],
          summary: "Crear el primer usuario OWNER (solo si la BD está vacía)",
          headers: {
            type: "object",
            required: ["x-bootstrap-token"],
            properties: { "x-bootstrap-token": { type: "string" } },
          },
          body: {
            type: "object",
            required: ["email", "password", "fullName"],
            properties: {
              email: { type: "string" },
              password: { type: "string" },
              fullName: { type: "string" },
              phone: { type: "string" },
            },
          },
        },
      },
      async (req, reply) => {
        const token = String(req.headers["x-bootstrap-token"] ?? "");
        if (token !== env.BOOTSTRAP_TOKEN) return reply.code(401).send({ error: "invalid_bootstrap_token" });

        const body = z
          .object({
            email: z.string().email(),
            password: z.string().min(8),
            fullName: z.string().min(1),
            phone: z.string().optional(),
          })
          .parse(req.body);

        const count = await prisma.user.count();
        if (count > 0) return reply.code(409).send({ error: "already_bootstrapped" });

        const ownerRole = await prisma.role.findUnique({ where: { code: "OWNER" } });
        if (!ownerRole) return reply.code(500).send({ error: "missing_owner_role" });

        const phoneE164 = normalizePhoneE164(body.phone);
        const user = await prisma.user.create({
          data: {
            email: normalizeEmail(body.email)!,
            passwordHash: await hashPassword(body.password),
            fullName: cleanPersonName(body.fullName),
            phoneE164,
            roles: { create: [{ roleId: ownerRole.id }] },
          },
          include: { roles: { include: { role: true } } },
        });

        const roles = user.roles.map((r) => r.role.code);
        const jwt = await reply.jwtSign({ sub: user.id, roles } satisfies { sub: number; roles: RoleCode[] }, { expiresIn: "7d" });

        await writeAuditLog({ actorUserId: user.id, action: "BOOTSTRAP", entity: "User", entityId: user.id });

        return { token: jwt, user: { id: user.id, email: user.email, fullName: user.fullName, phoneE164: user.phoneE164, roles } };
      },
    );

    v1.post(
      "/auth/login",
      {
        schema: {
          tags: ["auth"],
          summary: "Login (JWT)",
          body: {
            type: "object",
            required: ["email", "password"],
            properties: { email: { type: "string" }, password: { type: "string" } },
          },
        },
      },
      async (req, reply) => {
        const body = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(req.body);
        const user = await prisma.user.findUnique({
          where: { email: normalizeEmail(body.email)! },
          include: { roles: { include: { role: true } } },
        });
        if (!user || user.status !== "ACTIVE") return reply.code(401).send({ error: "invalid_credentials" });

        const ok = await verifyPassword(body.password, user.passwordHash);
        if (!ok) return reply.code(401).send({ error: "invalid_credentials" });

        const roles = user.roles.map((r) => r.role.code);
        const token = await reply.jwtSign({ sub: user.id, roles } satisfies { sub: number; roles: RoleCode[] }, { expiresIn: "7d" });

        await writeAuditLog({ actorUserId: user.id, action: "LOGIN", entity: "User", entityId: user.id });

        return { token, user: { id: user.id, email: user.email, fullName: user.fullName, phoneE164: user.phoneE164, roles } };
      },
    );

    // --- Perfil ---
    v1.get(
      "/auth/me",
      {
        preHandler: [app.authenticate],
        schema: { tags: ["auth"], summary: "Perfil del usuario autenticado" },
      },
      async (req) => {
        const user = await prisma.user.findUnique({
          where: { id: req.user!.id },
          include: { roles: { include: { role: true } } },
        });
        return {
          user: user
            ? {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                phoneE164: user.phoneE164,
                status: user.status,
                roles: user.roles.map((r) => r.role.code),
              }
            : null,
        };
      },
    );

    // --- Admin usuarios ---
    v1.post(
      "/auth/users",
      {
        preHandler: [app.authenticate, app.requireRoles([...ADMIN])],
        schema: {
          tags: ["auth"],
          summary: "Crear usuario (ADMIN/OWNER)",
          body: {
            type: "object",
            required: ["email", "password", "fullName", "roles"],
            properties: {
              email: { type: "string" },
              password: { type: "string" },
              fullName: { type: "string" },
              phone: { type: "string" },
              roles: { type: "array", items: { type: "string" } },
            },
          },
        },
      },
      async (req, reply) => {
        const body = z
          .object({
            email: z.string().email(),
            password: z.string().min(8),
            fullName: z.string().min(1),
            phone: z.string().optional(),
            roles: z.array(z.enum(["OWNER", "ADMIN", "STAFF", "VIEWER"])).min(1),
          })
          .parse(req.body);

        const phoneE164 = normalizePhoneE164(body.phone);
        const roleRows = await prisma.role.findMany({ where: { code: { in: body.roles } } });
        if (roleRows.length !== body.roles.length) return reply.code(400).send({ error: "invalid_roles" });

        const user = await prisma.user.create({
          data: {
            email: normalizeEmail(body.email)!,
            passwordHash: await hashPassword(body.password),
            fullName: cleanPersonName(body.fullName),
            phoneE164,
            roles: { create: roleRows.map((r) => ({ roleId: r.id })) },
          },
          include: { roles: { include: { role: true } } },
        });

        await writeAuditLog({
          actorUserId: req.user!.id,
          action: "USER_CREATE",
          entity: "User",
          entityId: user.id,
          metadata: { roles: body.roles },
        });

        return { user: { id: user.id, email: user.email, roles: user.roles.map((x) => x.role.code) } };
      },
    );

    // --- Clientes ---
    v1.get(
      "/customers",
      {
        preHandler: [app.authenticate, app.requireRoles([...VIEW])],
        schema: { tags: ["customers"], summary: "Listar clientes" },
      },
      async () => {
        const customers = await prisma.customer.findMany({ orderBy: { id: "desc" }, take: 500 });
        return { customers };
      },
    );

    v1.post(
      "/customers",
      {
        preHandler: [app.authenticate, app.requireRoles([...OPS])],
        schema: {
          tags: ["customers"],
          summary: "Crear cliente",
          body: {
            type: "object",
            required: ["fullName"],
            properties: { fullName: { type: "string" }, phone: { type: "string" }, email: { type: "string" }, notes: { type: "string" } },
          },
        },
      },
      async (req, reply) => {
        const body = z
          .object({
            fullName: z.string().min(1),
            phone: z.string().optional(),
            email: z.string().email().optional(),
            notes: z.string().optional(),
          })
          .parse(req.body);

        const phoneE164 = normalizePhoneE164(body.phone);
        const email = normalizeEmail(body.email);

        try {
          const customer = await prisma.customer.create({
            data: {
              fullName: cleanPersonName(body.fullName),
              phoneE164,
              email: email ?? undefined,
              notes: body.notes,
            },
          });
          await writeAuditLog({ actorUserId: req.user!.id, action: "CUSTOMER_CREATE", entity: "Customer", entityId: customer.id });
          return { customer };
        } catch (e) {
          return reply.code(409).send({ error: "duplicate_phone_or_email" });
        }
      },
    );

    v1.patch(
      "/customers/:id",
      {
        preHandler: [app.authenticate, app.requireRoles([...OPS])],
        schema: {
          tags: ["customers"],
          summary: "Actualizar cliente",
          params: { type: "object", required: ["id"], properties: { id: { type: "integer" } } },
        },
      },
      async (req, reply) => {
        const { id } = z.object({ id: z.coerce.number().int() }).parse(req.params);
        const body = z
          .object({
            fullName: z.string().min(1).optional(),
            phone: z.string().optional().nullable(),
            email: z.string().email().optional().nullable(),
            notes: z.string().optional().nullable(),
          })
          .parse(req.body);

        const phoneE164 = body.phone === null ? null : normalizePhoneE164(body.phone ?? undefined);
        const email = body.email === null ? null : normalizeEmail(body.email ?? undefined);

        try {
          const customer = await prisma.customer.update({
            where: { id },
            data: {
              fullName: body.fullName ? cleanPersonName(body.fullName) : undefined,
              phoneE164: phoneE164 === undefined ? undefined : phoneE164,
              email: email === undefined ? undefined : email ?? null,
              notes: body.notes === undefined ? undefined : body.notes,
            },
          });
          await writeAuditLog({ actorUserId: req.user!.id, action: "CUSTOMER_UPDATE", entity: "Customer", entityId: id });
          return { customer };
        } catch {
          return reply.code(404).send({ error: "not_found_or_conflict" });
        }
      },
    );

    // --- Barrios / localidades ---
    v1.get(
      "/neighborhoods",
      { preHandler: [app.authenticate, app.requireRoles([...VIEW])], schema: { tags: ["geo"], summary: "Listar barrios" } },
      async () => ({ neighborhoods: await prisma.neighborhood.findMany({ orderBy: [{ locality: "asc" }, { name: "asc" }], take: 2000 }) }),
    );

    v1.post(
      "/neighborhoods",
      {
        preHandler: [app.authenticate, app.requireRoles([...OPS])],
        schema: {
          tags: ["geo"],
          summary: "Crear barrio (localidad + nombre)",
          body: { type: "object", required: ["locality", "name"], properties: { locality: { type: "string" }, name: { type: "string" } } },
        },
      },
      async (req, reply) => {
        const body = z.object({ locality: z.string().min(1), name: z.string().min(1) }).parse(req.body);
        const locality = cleanPersonName(body.locality);
        const name = cleanPersonName(body.name);
        try {
          const neighborhood = await prisma.neighborhood.create({ data: { locality, name } });
          await writeAuditLog({ actorUserId: req.user!.id, action: "NEIGHBORHOOD_CREATE", entity: "Neighborhood", entityId: neighborhood.id });
          return { neighborhood };
        } catch {
          return reply.code(409).send({ error: "duplicate_neighborhood" });
        }
      },
    );

    // --- Direcciones ---
    v1.post(
      "/addresses",
      {
        preHandler: [app.authenticate, app.requireRoles([...OPS])],
        schema: {
          tags: ["geo"],
          summary: "Crear dirección",
          body: {
            type: "object",
            required: ["line1"],
            properties: {
              customerId: { type: "integer" },
              neighborhoodId: { type: "integer" },
              label: { type: "string" },
              line1: { type: "string" },
              mapsUrl: { type: "string" },
            },
          },
        },
      },
      async (req) => {
        const body = z
          .object({
            customerId: z.number().int().optional(),
            neighborhoodId: z.number().int().optional(),
            label: z.string().optional(),
            line1: z.string().min(1),
            mapsUrl: z.string().url().optional(),
          })
          .parse(req.body);

        const address = await prisma.address.create({
          data: {
            customerId: body.customerId,
            neighborhoodId: body.neighborhoodId,
            label: body.label,
            line1: cleanPersonName(body.line1),
            mapsUrl: body.mapsUrl,
          },
        });
        await writeAuditLog({ actorUserId: req.user!.id, action: "ADDRESS_CREATE", entity: "Address", entityId: address.id });
        return { address };
      },
    );

    v1.patch(
      "/addresses/:id",
      {
        preHandler: [app.authenticate, app.requireRoles([...OPS])],
        schema: { tags: ["geo"], summary: "Actualizar dirección", params: { type: "object", required: ["id"], properties: { id: { type: "integer" } } } },
      },
      async (req, reply) => {
        const { id } = z.object({ id: z.coerce.number().int() }).parse(req.params);
        const body = z
          .object({
            customerId: z.number().int().optional().nullable(),
            neighborhoodId: z.number().int().optional().nullable(),
            label: z.string().optional().nullable(),
            line1: z.string().min(1).optional(),
            mapsUrl: z.string().url().optional().nullable(),
          })
          .parse(req.body);

        try {
          const address = await prisma.address.update({
            where: { id },
            data: {
              customerId: body.customerId === undefined ? undefined : body.customerId,
              neighborhoodId: body.neighborhoodId === undefined ? undefined : body.neighborhoodId,
              label: body.label === undefined ? undefined : body.label,
              line1: body.line1 ? cleanPersonName(body.line1) : undefined,
              mapsUrl: body.mapsUrl === undefined ? undefined : body.mapsUrl,
            },
          });
          await writeAuditLog({ actorUserId: req.user!.id, action: "ADDRESS_UPDATE", entity: "Address", entityId: id });
          return { address };
        } catch {
          return reply.code(404).send({ error: "not_found" });
        }
      },
    );

    // --- Citas ---
    v1.get(
      "/appointments",
      {
        preHandler: [app.authenticate, app.requireRoles([...VIEW])],
        schema: {
          tags: ["appointments"],
          summary: "Listar citas",
          querystring: {
            type: "object",
            properties: {
              status: { type: "string" },
              customerId: { type: "integer" },
              from: { type: "string" },
              to: { type: "string" },
            },
          },
        },
      },
      async (req) => {
        const q = z
          .object({
            status: z.string().optional(),
            customerId: z.coerce.number().int().optional(),
            from: z.string().datetime().optional(),
            to: z.string().datetime().optional(),
          })
          .parse(req.query);

        const where: Prisma.AppointmentWhereInput = {};
        if (q.status) where.status = q.status as AppointmentStatus;
        if (q.customerId) where.customerId = q.customerId;
        if (q.from || q.to) {
          const range: Prisma.DateTimeNullableFilter = {};
          if (q.from) range.gte = new Date(q.from);
          if (q.to) range.lte = new Date(q.to);
          where.OR = [{ startAt: range }, { requestedStartAt: range }];
        }

        const appointments = await prisma.appointment.findMany({
          where,
          orderBy: [{ startAt: "desc" }, { createdAt: "desc" }],
          take: 500,
          include: {
            customer: true,
            address: { include: { neighborhood: true } },
            participants: true,
            plannedServices: { include: { service: { include: { category: true } } } },
            actualServices: { include: { service: { include: { category: true } } } },
            payments: true,
            formSubmission: true,
          },
        });
        return { appointments };
      },
    );

    v1.get(
      "/appointments/:id",
      {
        preHandler: [app.authenticate, app.requireRoles([...VIEW])],
        schema: { tags: ["appointments"], summary: "Obtener cita", params: { type: "object", required: ["id"], properties: { id: { type: "integer" } } } },
      },
      async (req, reply) => {
        const { id } = z.object({ id: z.coerce.number().int() }).parse(req.params);
        const appointment = await prisma.appointment.findUnique({
          where: { id },
          include: {
            customer: true,
            address: { include: { neighborhood: true } },
            participants: true,
            plannedServices: { include: { service: { include: { category: true, prices: { where: { effectiveTo: null }, take: 1 } } } } },
            actualServices: { include: { service: { include: { category: true } } } },
            payments: true,
            formSubmission: true,
          },
        });
        if (!appointment) return reply.code(404).send({ error: "not_found" });
        return { appointment };
      },
    );

    v1.post(
      "/appointments",
      {
        preHandler: [app.authenticate, app.requireRoles([...OPS])],
        schema: {
          tags: ["appointments"],
          summary: "Crear cita manual",
          body: {
            type: "object",
            required: ["customerId"],
            properties: {
              customerId: { type: "integer" },
              addressId: { type: "integer" },
              status: { type: "string" },
              startAt: { type: "string" },
              requestedStartAt: { type: "string" },
              requestedTimeText: { type: "string" },
              requestedFlexible: { type: "boolean" },
              leadName: { type: "string" },
              leadPhone: { type: "string" },
              notes: { type: "string" },
              source: { type: "string" },
            },
          },
        },
      },
      async (req) => {
        const body = z
          .object({
            customerId: z.number().int(),
            addressId: z.number().int().optional(),
            status: z.string().optional(),
            startAt: z.string().datetime().optional(),
            requestedStartAt: z.string().datetime().optional(),
            requestedTimeText: z.string().optional(),
            requestedFlexible: z.boolean().optional(),
            leadName: z.string().optional(),
            leadPhone: z.string().optional(),
            notes: z.string().optional(),
            source: z.string().optional(),
          })
          .parse(req.body);

        const appt = await prisma.appointment.create({
          data: {
            customerId: body.customerId,
            addressId: body.addressId,
            status: (body.status as AppointmentStatus | undefined) ?? "PENDING",
            startAt: body.startAt ? new Date(body.startAt) : undefined,
            requestedStartAt: body.requestedStartAt ? new Date(body.requestedStartAt) : undefined,
            requestedTimeText: body.requestedTimeText,
            requestedFlexible: body.requestedFlexible,
            leadName: body.leadName ? cleanPersonName(body.leadName) : undefined,
            leadPhoneE164: normalizePhoneE164(body.leadPhone),
            notes: body.notes,
            source: body.source ?? "manual",
          },
        });
        await writeAuditLog({ actorUserId: req.user!.id, action: "APPOINTMENT_CREATE", entity: "Appointment", entityId: appt.id });
        return { appointment: appt };
      },
    );

    v1.patch(
      "/appointments/:id",
      {
        preHandler: [app.authenticate, app.requireRoles([...OPS])],
        schema: { tags: ["appointments"], summary: "Actualizar cita", params: { type: "object", required: ["id"], properties: { id: { type: "integer" } } } },
      },
      async (req, reply) => {
        const { id } = z.object({ id: z.coerce.number().int() }).parse(req.params);
        const body = z
          .object({
            customerId: z.number().int().optional(),
            addressId: z.number().int().optional().nullable(),
            status: z.string().optional(),
            startAt: z.string().datetime().optional().nullable(),
            endAt: z.string().datetime().optional().nullable(),
            requestedStartAt: z.string().datetime().optional().nullable(),
            requestedTimeText: z.string().optional().nullable(),
            requestedFlexible: z.boolean().optional().nullable(),
            leadName: z.string().optional().nullable(),
            leadPhone: z.string().optional().nullable(),
            notes: z.string().optional().nullable(),
          })
          .parse(req.body);

        try {
          const appointment = await prisma.appointment.update({
            where: { id },
            data: {
              customerId: body.customerId,
              addressId: body.addressId === undefined ? undefined : body.addressId,
              status: body.status ? (body.status as AppointmentStatus) : undefined,
              startAt: body.startAt === undefined ? undefined : body.startAt ? new Date(body.startAt) : null,
              endAt: body.endAt === undefined ? undefined : body.endAt ? new Date(body.endAt) : null,
              requestedStartAt:
                body.requestedStartAt === undefined ? undefined : body.requestedStartAt ? new Date(body.requestedStartAt) : null,
              requestedTimeText: body.requestedTimeText === undefined ? undefined : body.requestedTimeText,
              requestedFlexible: body.requestedFlexible === undefined ? undefined : body.requestedFlexible,
              leadName: body.leadName === undefined ? undefined : body.leadName ? cleanPersonName(body.leadName) : null,
              leadPhoneE164: body.leadPhone === undefined ? undefined : body.leadPhone ? normalizePhoneE164(body.leadPhone) : null,
              notes: body.notes === undefined ? undefined : body.notes,
            },
          });
          await writeAuditLog({ actorUserId: req.user!.id, action: "APPOINTMENT_UPDATE", entity: "Appointment", entityId: id });
          return { appointment };
        } catch {
          return reply.code(404).send({ error: "not_found" });
        }
      },
    );

    v1.delete(
      "/appointments/:id",
      {
        preHandler: [app.authenticate, app.requireRoles([...ADMIN])],
        schema: { tags: ["appointments"], summary: "Eliminar cita (ADMIN)", params: { type: "object", required: ["id"], properties: { id: { type: "integer" } } } },
      },
      async (req, reply) => {
        const { id } = z.object({ id: z.coerce.number().int() }).parse(req.params);
        try {
          await prisma.appointment.delete({ where: { id } });
          await writeAuditLog({ actorUserId: req.user!.id, action: "APPOINTMENT_DELETE", entity: "Appointment", entityId: id });
          return { ok: true };
        } catch {
          return reply.code(404).send({ error: "not_found" });
        }
      },
    );

    v1.post(
      "/appointments/:id/participants",
      {
        preHandler: [app.authenticate, app.requireRoles([...OPS])],
        schema: {
          tags: ["appointments"],
          summary: "Agregar participante",
          params: { type: "object", required: ["id"], properties: { id: { type: "integer" } } },
          body: { type: "object", properties: { fullName: { type: "string" }, roleLabel: { type: "string" }, notes: { type: "string" } } },
        },
      },
      async (req) => {
        const { id } = z.object({ id: z.coerce.number().int() }).parse(req.params);
        const body = z.object({ fullName: z.string().optional(), roleLabel: z.string().optional(), notes: z.string().optional() }).parse(req.body);
        const participant = await prisma.appointmentParticipant.create({
          data: {
            appointmentId: id,
            fullName: body.fullName ? cleanPersonName(body.fullName) : undefined,
            roleLabel: body.roleLabel,
            notes: body.notes,
          },
        });
        await writeAuditLog({ actorUserId: req.user!.id, action: "PARTICIPANT_ADD", entity: "Appointment", entityId: id, metadata: { participantId: participant.id } });
        return { participant };
      },
    );

    v1.delete(
      "/appointments/:appointmentId/participants/:participantId",
      {
        preHandler: [app.authenticate, app.requireRoles([...OPS])],
        schema: {
          tags: ["appointments"],
          summary: "Eliminar participante",
          params: {
            type: "object",
            required: ["appointmentId", "participantId"],
            properties: { appointmentId: { type: "integer" }, participantId: { type: "integer" } },
          },
        },
      },
      async (req, reply) => {
        const p = z.object({ appointmentId: z.coerce.number().int(), participantId: z.coerce.number().int() }).parse(req.params);
        try {
          const res = await prisma.appointmentParticipant.deleteMany({
            where: { id: p.participantId, appointmentId: p.appointmentId },
          });
          if (res.count === 0) return reply.code(404).send({ error: "not_found" });
          await writeAuditLog({ actorUserId: req.user!.id, action: "PARTICIPANT_DELETE", entity: "Appointment", entityId: p.appointmentId, metadata: { participantId: p.participantId } });
          return { ok: true };
        } catch {
          return reply.code(404).send({ error: "not_found" });
        }
      },
    );

    v1.put(
      "/appointments/:id/planned-services",
      {
        preHandler: [app.authenticate, app.requireRoles([...OPS])],
        schema: {
          tags: ["appointments"],
          summary: "Reemplazar servicios planeados (operación)",
          params: { type: "object", required: ["id"], properties: { id: { type: "integer" } } },
          body: {
            type: "object",
            required: ["items"],
            properties: {
              items: {
                type: "array",
                items: {
                  type: "object",
                  required: ["serviceId"],
                  properties: { serviceId: { type: "integer" }, quantity: { type: "integer" }, priceCOP: { type: "integer" }, notes: { type: "string" } },
                },
              },
            },
          },
        },
      },
      async (req) => {
        const { id } = z.object({ id: z.coerce.number().int() }).parse(req.params);
        const body = z
          .object({
            items: z.array(z.object({ serviceId: z.number().int(), quantity: z.number().int().min(1).default(1), priceCOP: z.number().int().optional(), notes: z.string().optional() })),
          })
          .parse(req.body);

        await prisma.$transaction(async (tx) => {
          await tx.appointmentPlannedService.deleteMany({ where: { appointmentId: id } });
          if (body.items.length) {
            await tx.appointmentPlannedService.createMany({
              data: body.items.map((i) => ({
                appointmentId: id,
                serviceId: i.serviceId,
                quantity: i.quantity,
                priceCOP: i.priceCOP,
                notes: i.notes,
              })),
            });
          }
        });

        await writeAuditLog({ actorUserId: req.user!.id, action: "PLANNED_SERVICES_REPLACE", entity: "Appointment", entityId: id });
        const plannedServices = await prisma.appointmentPlannedService.findMany({ where: { appointmentId: id }, include: { service: true } });
        return { plannedServices };
      },
    );

    v1.post(
      "/appointments/:id/complete",
      {
        preHandler: [app.authenticate, app.requireRoles([...OPS])],
        schema: {
          tags: ["appointments"],
          summary: "Cerrar cita (servicios reales + pago opcional)",
          params: { type: "object", required: ["id"], properties: { id: { type: "integer" } } },
          body: {
            type: "object",
            properties: {
              notes: { type: "string" },
              actualServices: {
                type: "array",
                items: {
                  type: "object",
                  required: ["serviceId"],
                  properties: {
                    serviceId: { type: "integer" },
                    quantity: { type: "integer" },
                    priceCOP: { type: "integer" },
                    origin: { type: "string" },
                    notes: { type: "string" },
                  },
                },
              },
              payment: {
                type: "object",
                required: ["amountCOP", "method"],
                properties: { amountCOP: { type: "integer" }, method: { type: "string" }, reference: { type: "string" } },
              },
            },
          },
        },
      },
      async (req, reply) => {
        const { id } = z.object({ id: z.coerce.number().int() }).parse(req.params);
        const body = z
          .object({
            notes: z.string().optional(),
            actualServices: z
              .array(
                z.object({
                  serviceId: z.number().int(),
                  quantity: z.number().int().min(1).default(1),
                  priceCOP: z.number().int().optional(),
                  origin: z.enum(["RESERVED", "ON_SITE_CHANGED", "ON_SITE_ADDED"]).optional(),
                  notes: z.string().optional(),
                }),
              )
              .optional(),
            payment: z
              .object({ amountCOP: z.number().int().positive(), method: z.enum(["CASH", "TRANSFER", "NEQUI", "DAVIPLATA", "CARD", "OTHER"]), reference: z.string().optional() })
              .optional(),
          })
          .parse(req.body);

        const appt = await prisma.appointment.findUnique({ where: { id } });
        if (!appt) return reply.code(404).send({ error: "not_found" });

        await prisma.$transaction(async (tx) => {
          if (body.notes) await tx.appointment.update({ where: { id }, data: { notes: body.notes } });

          if (body.actualServices?.length) {
            for (const s of body.actualServices) {
              await tx.appointmentActualService.create({
                data: {
                  appointmentId: id,
                  serviceId: s.serviceId,
                  quantity: s.quantity,
                  priceCOP: s.priceCOP,
                  origin: (s.origin as any) ?? "ON_SITE_ADDED",
                  notes: s.notes,
                },
              });
            }
          }

          if (body.payment) {
            await tx.payment.create({
              data: {
                appointmentId: id,
                amountCOP: body.payment.amountCOP,
                method: body.payment.method as PaymentMethod,
                reference: body.payment.reference,
              },
            });
          }

          await tx.appointment.update({ where: { id }, data: { status: "COMPLETED", endAt: new Date() } });
        });

        await writeAuditLog({ actorUserId: req.user!.id, action: "APPOINTMENT_COMPLETE", entity: "Appointment", entityId: id });
        return { ok: true };
      },
    );

    v1.post(
      "/payments",
      {
        preHandler: [app.authenticate, app.requireRoles([...OPS])],
        schema: {
          tags: ["billing"],
          summary: "Registrar pago",
          body: {
            type: "object",
            required: ["appointmentId", "amountCOP", "method"],
            properties: {
              appointmentId: { type: "integer" },
              amountCOP: { type: "integer" },
              method: { type: "string" },
              reference: { type: "string" },
              notes: { type: "string" },
            },
          },
        },
      },
      async (req) => {
        const body = z
          .object({
            appointmentId: z.number().int(),
            amountCOP: z.number().int().positive(),
            method: z.enum(["CASH", "TRANSFER", "NEQUI", "DAVIPLATA", "CARD", "OTHER"]),
            reference: z.string().optional(),
            notes: z.string().optional(),
          })
          .parse(req.body);

        const payment = await prisma.payment.create({
          data: {
            appointmentId: body.appointmentId,
            amountCOP: body.amountCOP,
            method: body.method,
            reference: body.reference,
            notes: body.notes,
          },
        });
        await writeAuditLog({ actorUserId: req.user!.id, action: "PAYMENT_CREATE", entity: "Payment", entityId: payment.id });
        return { payment };
      },
    );

    // --- Catálogo (lectura) ---
    v1.get(
      "/catalog/services",
      {
        preHandler: [app.authenticate, app.requireRoles([...VIEW])],
        schema: { tags: ["catalog"], summary: "Listar servicios activos + precio vigente" },
      },
      async () => {
        const services = await prisma.service.findMany({
          where: { isActive: true },
          orderBy: [{ categoryId: "asc" }, { name: "asc" }],
          include: {
            category: true,
            prices: { where: { effectiveTo: null }, orderBy: { effectiveFrom: "desc" }, take: 1 },
          },
        });
        return { services };
      },
    );

    v1.post(
      "/catalog/services/:id/price",
      {
        preHandler: [app.authenticate, app.requireRoles([...ADMIN])],
        schema: {
          tags: ["catalog"],
          summary: "Cambiar precio vigente de un servicio",
          params: { type: "object", required: ["id"], properties: { id: { type: "integer" } } },
          body: { type: "object", required: ["amountCOP"], properties: { amountCOP: { type: "integer" } } },
        },
      },
      async (req, reply) => {
        const { id } = z.object({ id: z.coerce.number().int() }).parse(req.params);
        const body = z.object({ amountCOP: z.number().int().positive() }).parse(req.body);

        const service = await prisma.service.findUnique({ where: { id } });
        if (!service) return reply.code(404).send({ error: "not_found" });

        await prisma.$transaction(async (tx) => {
          const current = await tx.servicePrice.findFirst({ where: { serviceId: id, effectiveTo: null }, orderBy: { effectiveFrom: "desc" } });
          if (current) await tx.servicePrice.update({ where: { id: current.id }, data: { effectiveTo: new Date() } });
          await tx.servicePrice.create({ data: { serviceId: id, amountCOP: body.amountCOP, currency: "COP" } });
        });

        await writeAuditLog({ actorUserId: req.user!.id, action: "SERVICE_PRICE_CHANGE", entity: "Service", entityId: id, metadata: { amountCOP: body.amountCOP } });
        return { ok: true };
      },
    );

    v1.get(
      "/admin/seed/services",
      {
        preHandler: [app.authenticate, app.requireRoles([...ADMIN])],
        schema: { tags: ["admin"], summary: "Sembrar catálogo (idempotente)" },
      },
      async (req) => {
        await seedServices();
        await writeAuditLog({ actorUserId: req.user!.id, action: "SEED_SERVICES", entity: "Service", entityId: null });
        return { ok: true };
      },
    );

    // --- Reportes simples ---
    v1.get(
      "/reports/daily",
      {
        preHandler: [app.authenticate, app.requireRoles([...VIEW])],
        schema: { tags: ["reports"], summary: "Reporte diario (pagos)", querystring: { type: "object", required: ["day"], properties: { day: { type: "string" } } } },
      },
      async (req) => {
        const q = z.object({ day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(req.query);
        const start = new Date(`${q.day}T00:00:00`);
        const end = new Date(`${q.day}T23:59:59.999`);

        const payments = await prisma.payment.findMany({ where: { paidAt: { gte: start, lte: end } } });
        const total = payments.reduce((acc, p) => acc + p.amountCOP, 0);
        return { day: q.day, paymentsCount: payments.length, totalCOP: total };
      },
    );
  }, { prefix: "/api/v1" });
}
