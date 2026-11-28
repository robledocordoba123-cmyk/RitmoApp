# Pruebas de punta a punta (Playwright)

Un navegador de verdad recorre RitmoApp como lo haría una persona: inicia sesión, reserva una clase, la ve en *Mis reservas* y la cancela. Es la acción AM-05 del plan de calidad (DOC-07).

| Caso | Qué prueba |
| --- | --- |
| CP-236 | El estudiante inicia sesión, reserva la última clase disponible del catálogo, la ve confirmada en *Mis reservas* y la cancela |
| CP-237 | Con la contraseña equivocada no entra y la pantalla explica por qué |

La prueba cancela la reserva al final, así que la base queda como estaba.

## Correrlas en tu computador

Usan una base de datos **solo para estas pruebas**, nunca la de desarrollo ni la de producción, porque reservan y cancelan clases de verdad.

1. Crear la base (una sola vez), con el contenedor de `docker compose` encendido:
   ```bash
   docker exec ritmoapp_db psql -U ritmoapp -d ritmoapp -c "CREATE DATABASE ritmoapp_e2e"
   ```
2. Cargar los datos de demostración y encender la API con esa base (desde `backend`):
   ```bash
   export DATABASE_URL="postgresql://ritmoapp:ritmoapp_dev@localhost:5432/ritmoapp_e2e?schema=public"
   npx prisma migrate deploy
   npm run prisma:seed
   npm run prisma:seed:demo
   node src/server.js
   ```
   Las membresías de la demo dependen de la fecha: si la cuenta de estudiante sale con la membresía vencida, vuelve a correr los dos `seed`.
3. En otra terminal, desde `frontend`:
   ```bash
   npm run test:e2e
   ```
   Playwright enciende la página en el puerto 5174 y usa el Chrome instalado. En GitHub Actions usa Chromium y corre en el trabajo **De punta a punta (Playwright)** de `ci.yml`.

Si una prueba falla, Playwright guarda una captura y un *trace* en `test-results/`. Se abre con `npx playwright show-trace <ruta del trace.zip>`.
