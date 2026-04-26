-- RedefineIndex
DROP INDEX "AuditLog_entity_entityId_idx";
CREATE INDEX "auditoria_entidad_entidad_id_idx" ON "auditoria"("entidad", "entidad_id");

-- RedefineIndex
DROP INDEX "AuditLog_createdAt_idx";
CREATE INDEX "auditoria_creado_en_idx" ON "auditoria"("creado_en");

-- RedefineIndex
DROP INDEX "Neighborhood_locality_name_key";
CREATE UNIQUE INDEX "barrio_localidad_nombre_key" ON "barrio"("localidad", "nombre");

-- RedefineIndex
DROP INDEX "Neighborhood_locality_idx";
CREATE INDEX "barrio_localidad_idx" ON "barrio"("localidad");

-- RedefineIndex
DROP INDEX "ServiceCategory_code_key";
CREATE UNIQUE INDEX "categoria_servicio_codigo_key" ON "categoria_servicio"("codigo");

-- RedefineIndex
DROP INDEX "Appointment_status_startAt_idx";
CREATE INDEX "cita_estado_inicio_en_idx" ON "cita"("estado", "inicio_en");

-- RedefineIndex
DROP INDEX "Appointment_formSubmissionId_key";
CREATE UNIQUE INDEX "cita_formulario_envio_id_key" ON "cita"("formulario_envio_id");

-- RedefineIndex
DROP INDEX "AppointmentPlannedService_appointmentId_serviceId_key";
CREATE UNIQUE INDEX "cita_servicio_planeado_cita_id_servicio_id_key" ON "cita_servicio_planeado"("cita_id", "servicio_id");

-- RedefineIndex
DROP INDEX "AppointmentActualService_appointmentId_idx";
CREATE INDEX "cita_servicio_real_cita_id_idx" ON "cita_servicio_real"("cita_id");

-- RedefineIndex
DROP INDEX "Customer_email_key";
CREATE UNIQUE INDEX "cliente_correo_key" ON "cliente"("correo");

-- RedefineIndex
DROP INDEX "Customer_phoneE164_key";
CREATE UNIQUE INDEX "cliente_telefono_e164_key" ON "cliente"("telefono_e164");

-- RedefineIndex
DROP INDEX "Address_neighborhoodId_idx";
CREATE INDEX "direccion_barrio_id_idx" ON "direccion"("barrio_id");

-- RedefineIndex
DROP INDEX "FormSubmission_sourceKey_key";
CREATE UNIQUE INDEX "formulario_envio_llave_origen_key" ON "formulario_envio"("llave_origen");

-- RedefineIndex
DROP INDEX "Payment_paidAt_idx";
CREATE INDEX "pago_pagado_en_idx" ON "pago"("pagado_en");

-- RedefineIndex
DROP INDEX "Role_code_key";
CREATE UNIQUE INDEX "rol_codigo_key" ON "rol"("codigo");

-- RedefineIndex
DROP INDEX "Service_categoryId_name_key";
CREATE UNIQUE INDEX "servicio_categoria_id_nombre_key" ON "servicio"("categoria_id", "nombre");

-- RedefineIndex
DROP INDEX "ServicePrice_serviceId_effectiveFrom_idx";
CREATE INDEX "servicio_precio_servicio_id_vigente_desde_idx" ON "servicio_precio"("servicio_id", "vigente_desde");

-- RedefineIndex
DROP INDEX "User_phoneE164_key";
CREATE UNIQUE INDEX "usuario_telefono_e164_key" ON "usuario"("telefono_e164");

-- RedefineIndex
DROP INDEX "User_email_key";
CREATE UNIQUE INDEX "usuario_correo_key" ON "usuario"("correo");

-- RedefineIndex
DROP INDEX "UserRole_roleId_idx";
CREATE INDEX "usuario_rol_rol_id_idx" ON "usuario_rol"("rol_id");
