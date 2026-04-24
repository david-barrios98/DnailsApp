## DNAILS – Gestión de negocio (base pro)
Este repo arranca una solución **profesional, rápida e intuitiva** para operar DNAILS:
- **Entrada**: Google Form (autogestión de reservas).
- **Sync**: importación desde Google Sheets (como CSV publicado) a una **BD normalizada**.
- **Operación real**: soporta cambios en domicilio (servicio adicional, cambio de servicio, grupo/familiares).
- **API**: lista para conectar una app móvil (fase siguiente).
 
### Problema que resuelve
Google Sheets sirve para capturar, pero se vuelve difícil para:
- modificar/confirmar citas,
- registrar lo que realmente pasó en domicilio,
- tener reportes limpios,
- mantener datos consistentes (clientes, direcciones, servicios, pagos).
 
### Enfoque (V1)
1. Publicar la hoja de respuestas del Form como **CSV** (sin credenciales).
2. Ejecutar un **importador** que:
   - detecta nuevas filas/cambios,
   - normaliza a tablas,
   - crea/actualiza clientes, direcciones y citas,
   - guarda “servicios planeados” vs “servicios reales”.
3. Exponer un **API local** para que una app móvil gestione:
   - confirmar/reprogramar,
   - marcar llegada/finalización,
   - agregar extras y familiares,
   - registrar pagos.
 
### Decisiones importantes (ya contempladas)
- **Reserva vs realidad**:
  - `AppointmentPlannedService` guarda lo reservado.
  - `AppointmentActualService` guarda lo ejecutado (incluye extras/cambios).
- **Grupo**:
  - una cita puede tener 1 o más personas (`AppointmentParticipant`).
- **IDs**: todas las tablas principales usan **enteros autoincrementales** (`Int`) para facilitar joins y reportes.
- **Catálogo normalizado**:
  - `ServiceCategory` + `Service` + `ServicePrice` (precio versionado).
  - `Neighborhood` (localidad + barrio) para rutas.
  - `FormSubmission` guarda el payload crudo del Form y se enlaza 1:1 a `Appointment`.
 
### Ver la API
Con el servidor corriendo en `backend/`:
- Swagger UI: `http://127.0.0.1:3333/docs`

### Autenticación (usuarios y roles)
- Primera vez: `POST /api/v1/auth/bootstrap` con header `x-bootstrap-token` (valor `BOOTSTRAP_TOKEN` en `.env`).
- Login: `POST /api/v1/auth/login` → devuelve `token` (JWT).
- En Swagger: **Authorize** → pega el token.
- El resto de endpoints vive bajo **`/api/v1/...`** y requiere JWT.

### Roles
- `OWNER`, `ADMIN`, `STAFF`, `VIEWER` (configurables en BD tabla `Role`).

### Modelo de base de datos (en español, “normalizado”)
Mapa de tablas y responsabilidad de cada una. Los **IDs** son **enteros autoincrementales** (`Int`) en las entidades principales.

#### Catálogo (servicios y precios)
- **`ServiceCategory`**: categorías (Uñas, Depilación, Cejas y pestañas, etc.) con `code` estable.
- **`Service`**: servicio dentro de una categoría (nombre, duración mínima/máxima en minutos, activo/inactivo).
- **`ServicePrice`**: **precio versionado** (histórico). El precio vigente es el registro con `effectiveTo = null`.

#### Geografía / domicilio
- **`Neighborhood`**: **localidad + barrio** (único por par), para rutas y reportes por zona.
- **`Address`**: dirección operativa:
  - `line1`: dirección exacta (texto)
  - `neighborhoodId`: barrio/localidad normalizado (FK)
  - `mapsUrl`, coordenadas opcionales
  - `customerId` opcional (útil si aún no amarras cliente)

#### Clientes y reservas (operación)
- **`Customer`**: cliente final.
  - `fullName` (limpia espacios)
  - `phoneE164` (**único**, formato internacional, típicamente `+57...`)
  - `email` opcional (**único** si existe)
  - `notes`
- **`FormSubmission`**: payload crudo del Google Form (auditoría / trazabilidad).
- **`Appointment`**: cita operativa.
  - `customerId`, `addressId`
  - `requestedStartAt`, `requestedTimeText`, `requestedFlexible` (preferencia del Form)
  - `startAt`, `endAt` (agenda real confirmada)
  - `leadName`, `leadPhoneE164` (quién agenda vs quién recibe; teléfono en E.164 si aplica)
  - `status` (flujo operativo)
  - `formSubmissionId` (1:1 con el Form cuando viene de autogestión)
- **`AppointmentParticipant`**: grupo/familia en la misma visita.
- **`AppointmentPlannedService`**: servicios **reservados** (puede haber varios por cita).
- **`AppointmentActualService`**: servicios **reales** ejecutados (extras/cambios en domicilio), con `origin`.
- **`Payment`**: cobros (puedes registrar varios pagos por cita).

#### Seguridad / auditoría
- **`Role`**: roles del sistema (`OWNER`, `ADMIN`, `STAFF`, `VIEWER`).
- **`User`**: usuario interno (email + hash de contraseña + teléfono opcional).
- **`UserRole`**: relación usuario↔rol.
- **`AuditLog`**: acciones relevantes (quién hizo qué).

#### Datos “limpios” (convenciones)
- **Teléfono**: se persiste como **`phoneE164`** (E.164). La API y el importador normalizan entradas comunes en Colombia (`DEFAULT_PHONE_REGION=CO` en `.env`).
- **Email**: minúsculas, sin espacios.
- **Nombres**: trim + colapso de espacios múltiples.

#### Archivo SQLite (desarrollo)
- Por defecto en este repo: `backend/prisma/dev2.db` (ruta definida por `DATABASE_URL` en `backend/.env`).
- Si alguna herramienta dejó bloqueado `dev.db`, se puede cambiar el nombre del archivo vía `DATABASE_URL`.

### Endpoints de gestión (API)
Base local: `http://127.0.0.1:3333`  
Swagger: `http://127.0.0.1:3333/docs`  
Prefijo: **`/api/v1`** (casi todo requiere JWT).

#### Públicos
- `GET /health`

#### Autenticación / usuarios
- `POST /api/v1/auth/bootstrap` (primera vez; header `x-bootstrap-token`)
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/users` (crear usuarios; `ADMIN`/`OWNER`)

#### Clientes
- `GET /api/v1/customers`
- `POST /api/v1/customers`
- `PATCH /api/v1/customers/:id`

#### Geografía / direcciones
- `GET /api/v1/neighborhoods`
- `POST /api/v1/neighborhoods`
- `POST /api/v1/addresses`
- `PATCH /api/v1/addresses/:id`

#### Citas
- `GET /api/v1/appointments` (query: `status`, `customerId`, `from`, `to`)
- `GET /api/v1/appointments/:id`
- `POST /api/v1/appointments`
- `PATCH /api/v1/appointments/:id`
- `DELETE /api/v1/appointments/:id` (`ADMIN`/`OWNER`)

#### Grupo / planeado / cierre
- `POST /api/v1/appointments/:id/participants`
- `DELETE /api/v1/appointments/:appointmentId/participants/:participantId`
- `PUT /api/v1/appointments/:id/planned-services` (reemplaza planeado)
- `POST /api/v1/appointments/:id/complete` (reales + pago opcional)

#### Cobros / catálogo / reportes
- `POST /api/v1/payments`
- `GET /api/v1/catalog/services`
- `POST /api/v1/catalog/services/:id/price` (`ADMIN`/`OWNER`)
- `GET /api/v1/admin/seed/services` (`ADMIN`/`OWNER`)
- `GET /api/v1/reports/daily?day=YYYY-MM-DD`

### Usuario y clave de login (desarrollo)
> **Advertencia**: esto es solo para tu entorno local de pruebas. En producción debes cambiar contraseñas, `JWT_SECRET` y `BOOTSTRAP_TOKEN`.

Usuario creado con bootstrap en esta máquina de desarrollo:

- **Email**: `owner@dnails.local`
- **Contraseña**: `password12345`

Si aún no existe usuario en tu BD, créalo con:

- **Header**: `x-bootstrap-token: dnails-bootstrap-change-me` (valor de `BOOTSTRAP_TOKEN` en `backend/.env`)
- **Endpoint**: `POST /api/v1/auth/bootstrap`

Luego inicia sesión con `POST /api/v1/auth/login` y usa el `token` en Swagger (**Authorize**).
