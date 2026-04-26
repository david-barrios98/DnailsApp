-- Renombrar tablas y columnas a español (SQLite).
-- Prisma seguirá usando los modelos/campos actuales gracias a @@map/@map.

PRAGMA foreign_keys=OFF;

-- Tablas base
ALTER TABLE "ServiceCategory" RENAME TO "categoria_servicio";
ALTER TABLE "categoria_servicio" RENAME COLUMN "code" TO "codigo";
ALTER TABLE "categoria_servicio" RENAME COLUMN "name" TO "nombre";
ALTER TABLE "categoria_servicio" RENAME COLUMN "createdAt" TO "creado_en";
ALTER TABLE "categoria_servicio" RENAME COLUMN "updatedAt" TO "actualizado_en";

ALTER TABLE "Neighborhood" RENAME TO "barrio";
ALTER TABLE "barrio" RENAME COLUMN "locality" TO "localidad";
ALTER TABLE "barrio" RENAME COLUMN "name" TO "nombre";
ALTER TABLE "barrio" RENAME COLUMN "createdAt" TO "creado_en";
ALTER TABLE "barrio" RENAME COLUMN "updatedAt" TO "actualizado_en";

ALTER TABLE "Role" RENAME TO "rol";
ALTER TABLE "rol" RENAME COLUMN "code" TO "codigo";
ALTER TABLE "rol" RENAME COLUMN "name" TO "nombre";
ALTER TABLE "rol" RENAME COLUMN "createdAt" TO "creado_en";
ALTER TABLE "rol" RENAME COLUMN "updatedAt" TO "actualizado_en";

ALTER TABLE "User" RENAME TO "usuario";
ALTER TABLE "usuario" RENAME COLUMN "email" TO "correo";
ALTER TABLE "usuario" RENAME COLUMN "passwordHash" TO "hash_contrasena";
ALTER TABLE "usuario" RENAME COLUMN "fullName" TO "nombre_completo";
ALTER TABLE "usuario" RENAME COLUMN "phoneE164" TO "telefono_e164";
ALTER TABLE "usuario" RENAME COLUMN "status" TO "estado";
ALTER TABLE "usuario" RENAME COLUMN "createdAt" TO "creado_en";
ALTER TABLE "usuario" RENAME COLUMN "updatedAt" TO "actualizado_en";

ALTER TABLE "UserRole" RENAME TO "usuario_rol";
ALTER TABLE "usuario_rol" RENAME COLUMN "userId" TO "usuario_id";
ALTER TABLE "usuario_rol" RENAME COLUMN "roleId" TO "rol_id";

ALTER TABLE "AuditLog" RENAME TO "auditoria";
ALTER TABLE "auditoria" RENAME COLUMN "actorUserId" TO "actor_usuario_id";
ALTER TABLE "auditoria" RENAME COLUMN "action" TO "accion";
ALTER TABLE "auditoria" RENAME COLUMN "entity" TO "entidad";
ALTER TABLE "auditoria" RENAME COLUMN "entityId" TO "entidad_id";
ALTER TABLE "auditoria" RENAME COLUMN "metadata" TO "metadatos";
ALTER TABLE "auditoria" RENAME COLUMN "createdAt" TO "creado_en";

ALTER TABLE "Customer" RENAME TO "cliente";
ALTER TABLE "cliente" RENAME COLUMN "fullName" TO "nombre_completo";
ALTER TABLE "cliente" RENAME COLUMN "phoneE164" TO "telefono_e164";
ALTER TABLE "cliente" RENAME COLUMN "email" TO "correo";
ALTER TABLE "cliente" RENAME COLUMN "notes" TO "notas";
ALTER TABLE "cliente" RENAME COLUMN "createdAt" TO "creado_en";
ALTER TABLE "cliente" RENAME COLUMN "updatedAt" TO "actualizado_en";

ALTER TABLE "Address" RENAME TO "direccion";
ALTER TABLE "direccion" RENAME COLUMN "customerId" TO "cliente_id";
ALTER TABLE "direccion" RENAME COLUMN "neighborhoodId" TO "barrio_id";
ALTER TABLE "direccion" RENAME COLUMN "label" TO "etiqueta";
ALTER TABLE "direccion" RENAME COLUMN "line1" TO "direccion_linea1";
ALTER TABLE "direccion" RENAME COLUMN "mapsUrl" TO "maps_url";
ALTER TABLE "direccion" RENAME COLUMN "latitude" TO "latitud";
ALTER TABLE "direccion" RENAME COLUMN "longitude" TO "longitud";
ALTER TABLE "direccion" RENAME COLUMN "createdAt" TO "creado_en";
ALTER TABLE "direccion" RENAME COLUMN "updatedAt" TO "actualizado_en";

ALTER TABLE "Service" RENAME TO "servicio";
ALTER TABLE "servicio" RENAME COLUMN "categoryId" TO "categoria_id";
ALTER TABLE "servicio" RENAME COLUMN "name" TO "nombre";
ALTER TABLE "servicio" RENAME COLUMN "durationMin" TO "duracion_min";
ALTER TABLE "servicio" RENAME COLUMN "durationMax" TO "duracion_max";
ALTER TABLE "servicio" RENAME COLUMN "isActive" TO "activo";
ALTER TABLE "servicio" RENAME COLUMN "createdAt" TO "creado_en";
ALTER TABLE "servicio" RENAME COLUMN "updatedAt" TO "actualizado_en";

ALTER TABLE "ServicePrice" RENAME TO "servicio_precio";
ALTER TABLE "servicio_precio" RENAME COLUMN "serviceId" TO "servicio_id";
ALTER TABLE "servicio_precio" RENAME COLUMN "amountCOP" TO "monto_cop";
ALTER TABLE "servicio_precio" RENAME COLUMN "currency" TO "moneda";
ALTER TABLE "servicio_precio" RENAME COLUMN "effectiveFrom" TO "vigente_desde";
ALTER TABLE "servicio_precio" RENAME COLUMN "effectiveTo" TO "vigente_hasta";
ALTER TABLE "servicio_precio" RENAME COLUMN "createdAt" TO "creado_en";

ALTER TABLE "FormSubmission" RENAME TO "formulario_envio";
ALTER TABLE "formulario_envio" RENAME COLUMN "sourceKey" TO "llave_origen";
-- payload se mantiene como "payload"
ALTER TABLE "formulario_envio" RENAME COLUMN "createdAt" TO "creado_en";

ALTER TABLE "Appointment" RENAME TO "cita";
ALTER TABLE "cita" RENAME COLUMN "customerId" TO "cliente_id";
ALTER TABLE "cita" RENAME COLUMN "addressId" TO "direccion_id";
ALTER TABLE "cita" RENAME COLUMN "startAt" TO "inicio_en";
ALTER TABLE "cita" RENAME COLUMN "endAt" TO "fin_en";
ALTER TABLE "cita" RENAME COLUMN "requestedStartAt" TO "solicitado_inicio_en";
ALTER TABLE "cita" RENAME COLUMN "requestedTimeText" TO "solicitado_hora_texto";
ALTER TABLE "cita" RENAME COLUMN "requestedFlexible" TO "solicitado_flexible";
ALTER TABLE "cita" RENAME COLUMN "leadName" TO "lead_nombre";
ALTER TABLE "cita" RENAME COLUMN "leadPhoneE164" TO "lead_telefono_e164";
ALTER TABLE "cita" RENAME COLUMN "status" TO "estado";
ALTER TABLE "cita" RENAME COLUMN "notes" TO "notas";
ALTER TABLE "cita" RENAME COLUMN "source" TO "origen";
ALTER TABLE "cita" RENAME COLUMN "formSubmissionId" TO "formulario_envio_id";
ALTER TABLE "cita" RENAME COLUMN "createdAt" TO "creado_en";
ALTER TABLE "cita" RENAME COLUMN "updatedAt" TO "actualizado_en";

ALTER TABLE "AppointmentParticipant" RENAME TO "cita_participante";
ALTER TABLE "cita_participante" RENAME COLUMN "appointmentId" TO "cita_id";
ALTER TABLE "cita_participante" RENAME COLUMN "fullName" TO "nombre_completo";
ALTER TABLE "cita_participante" RENAME COLUMN "roleLabel" TO "rol_etiqueta";
ALTER TABLE "cita_participante" RENAME COLUMN "notes" TO "notas";
ALTER TABLE "cita_participante" RENAME COLUMN "createdAt" TO "creado_en";
ALTER TABLE "cita_participante" RENAME COLUMN "updatedAt" TO "actualizado_en";

ALTER TABLE "AppointmentPlannedService" RENAME TO "cita_servicio_planeado";
ALTER TABLE "cita_servicio_planeado" RENAME COLUMN "appointmentId" TO "cita_id";
ALTER TABLE "cita_servicio_planeado" RENAME COLUMN "serviceId" TO "servicio_id";
ALTER TABLE "cita_servicio_planeado" RENAME COLUMN "quantity" TO "cantidad";
ALTER TABLE "cita_servicio_planeado" RENAME COLUMN "priceCOP" TO "precio_cop";
ALTER TABLE "cita_servicio_planeado" RENAME COLUMN "notes" TO "notas";
ALTER TABLE "cita_servicio_planeado" RENAME COLUMN "createdAt" TO "creado_en";
ALTER TABLE "cita_servicio_planeado" RENAME COLUMN "updatedAt" TO "actualizado_en";

ALTER TABLE "AppointmentActualService" RENAME TO "cita_servicio_real";
ALTER TABLE "cita_servicio_real" RENAME COLUMN "appointmentId" TO "cita_id";
ALTER TABLE "cita_servicio_real" RENAME COLUMN "serviceId" TO "servicio_id";
ALTER TABLE "cita_servicio_real" RENAME COLUMN "quantity" TO "cantidad";
ALTER TABLE "cita_servicio_real" RENAME COLUMN "priceCOP" TO "precio_cop";
ALTER TABLE "cita_servicio_real" RENAME COLUMN "origin" TO "origen";
ALTER TABLE "cita_servicio_real" RENAME COLUMN "notes" TO "notas";
ALTER TABLE "cita_servicio_real" RENAME COLUMN "createdAt" TO "creado_en";
ALTER TABLE "cita_servicio_real" RENAME COLUMN "updatedAt" TO "actualizado_en";

ALTER TABLE "Payment" RENAME TO "pago";
ALTER TABLE "pago" RENAME COLUMN "appointmentId" TO "cita_id";
ALTER TABLE "pago" RENAME COLUMN "amountCOP" TO "monto_cop";
ALTER TABLE "pago" RENAME COLUMN "method" TO "metodo";
ALTER TABLE "pago" RENAME COLUMN "paidAt" TO "pagado_en";
ALTER TABLE "pago" RENAME COLUMN "reference" TO "referencia";
ALTER TABLE "pago" RENAME COLUMN "notes" TO "notas";

PRAGMA foreign_keys=ON;

