## Importación desde Google Sheets (CSV)

### Idea
Tu Google Form seguirá siendo la entrada de autogestión. La operación diaria se hará en la app/API.

Para evitar complejidad de credenciales en V1, importamos desde un **CSV publicado** del Sheet.

### Cómo publicar el CSV
En tu Google Sheet de respuestas:
- **Archivo → Publicar en la web**
- Elige la pestaña de respuestas (la hoja donde llegan las filas del Form)
- Formato: **CSV**
- Copia el link generado y pégalo en `GOOGLE_SHEET_CSV_URL` (archivo `.env`)

### Comandos
Desde `backend/`:
- Instalar: `npm i`
- Crear DB/migración: `npx prisma migrate dev`
- Importar: `npm run import:sheet`

> Importante: en V1 una fila ya importada **no se sobreescribe**, para no pisar lo que tú confirmes/cambies en domicilio.
> La deduplicación se hace por `FormSubmission.sourceKey` (derivado de marca temporal + WhatsApp).

