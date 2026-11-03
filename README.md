# RitmoApp

![CI](https://github.com/robledocordoba123-cmyk/RitmoApp/actions/workflows/ci.yml/badge.svg)

Plataforma SaaS multi-academia para que las escuelas de baile gestionen clases, horarios, cupos, reservas, asistencia, pagos y membresías, en lugar de hacerlo con cuadernos, Excel y grupos de WhatsApp.

> **Proyecto de grado** de la Tecnología en Análisis y Desarrollo de Software del SENA (ficha 3229209).

Cada academia se registra sola y trabaja con sus datos totalmente aislados de las demás. Hay cuatro roles: **SuperAdmin** (dueño de la plataforma), **Admin de academia**, **Profesor** y **Estudiante**.

### 🌐 Demo en vivo: **[ritmoapp-demo.vercel.app](https://ritmoapp-demo.vercel.app)**

En la pantalla de inicio de sesión puedes entrar con un clic como **Administrador**, **Profesor** o **Estudiante** de una academia de ejemplo con su agenda de clases. Los datos de la demo se restablecen solos.

> La API está en el plan gratuito de Render, que la apaga tras 15 minutos sin uso. De 7:00 a. m. a 9:00 p. m. (hora de Colombia) un monitor externo en [cron-job.org](https://cron-job.org) la consulta cada 10 minutos para que esté despierta; fuera de ese horario la primera entrada puede tardar cerca de un minuto.

![Panel del administrador](docs/capturas/03-admin-dashboard.png)

## Lo más interesante técnicamente

- **Aislamiento multi-tenant a nivel de ORM.** Una extensión de Prisma ([`tenantPrismaClient.js`](backend/src/config/tenantPrismaClient.js)) agrega el `tenantId` del usuario autenticado a *todas* las consultas de los modelos de negocio. Si alguien olvida filtrar por academia en un controlador, el cliente lo hace igual. Hay pruebas con dos academias que intentan leer y modificar datos de la otra.
- **Sin sobrecupo bajo concurrencia.** La reserva descuenta el cupo con un `UPDATE` condicional atómico (`WHERE cuposDisponibles > 0`) dentro de una transacción. Una prueba lanza dos solicitudes al mismo tiempo por el último cupo y verifica que solo una gana.
- **Reglas de agenda.** No se puede programar una clase si el salón o el profesor ya tienen otra en ese horario, ni con más cupos que la capacidad del salón. Un estudiante no puede reservar dos clases que se crucen.
- **Membresías.** Sin membresía vigente no se reserva. Cada pago extiende la membresía desde donde terminaba, y dos pagos registrados a la vez no se pisan (bloqueo de fila en la transacción).
- **Zonas horarias.** "Hoy" y los rangos de los reportes se calculan en hora de Colombia, no en UTC (una clase de 6:00 p. m. en Bogotá ya es "mañana" en UTC).
- **Seguridad.** JWT + bcrypt, control de acceso por rol, rate limiting en el login, el registro y la recuperación de contraseña, `helmet`, CORS restringido por entorno y la API no arranca si faltan variables obligatorias. El enlace de recuperación vence a los 30 minutos, sirve una sola vez y en la base de datos solo se guarda su hash.
- **Asistencia con código QR.** El estudiante muestra un QR de su reserva y el profesor lo escanea con la cámara. El código es un JWT firmado con una clave propia (derivada de la principal), con audiencia exclusiva y sin datos personales, así que no sirve como token de sesión ni para otra clase.
- **Bitácora de auditoría.** Un middleware anota cada cambio exitoso (quién, qué, cuándo y sobre qué registro) antes de responder; el administrador la consulta con buscador.
- **Correos y tareas programadas.** Aviso a los inscritos cuando se cancela una clase, comprobante de pago, recordatorio de la clase de mañana y aviso de membresía por vencer. Las dos últimas las dispara cada mañana un workflow de GitHub Actions contra un endpoint protegido con token, y una tabla evita enviar el mismo aviso dos veces. Nunca se envía a dominios de prueba (`.test`, `.example`, `.invalid`, `.localhost`).
- **Protección de datos (Ley 1581 de 2012).** Página de política de tratamiento de datos; al registrar la academia y al crear cada usuario se exige la autorización, y queda guardada la fecha y la versión aceptada.
- **195 pruebas automatizadas**, casos de prueba CP-001 a CP-195: 167 del backend (Jest + Supertest contra PostgreSQL real, sin mocks; el asistente de IA usa un cliente simulado) y 28 del frontend (Vitest + Testing Library). Corren en GitHub Actions en cada push, y la CI falla si la cobertura del backend baja de 80 % de líneas o 70 % de ramas (hoy 92,1 % y 81,0 %). SonarCloud analiza cada cambio: en main, 0 bugs, 0 vulnerabilidades y deuda técnica 0.

## Capturas

| Calendario semanal de clases | Reporte de ocupación por salón |
|---|---|
| ![Calendario](docs/capturas/05-admin-calendario.png) | ![Reporte](docs/capturas/06-admin-reportes.png) |

| Panel del profesor | Reservas del estudiante |
|---|---|
| ![Profesor](docs/capturas/07-profesor-dashboard.png) | ![Estudiante](docs/capturas/09-estudiante-reservas.png) |

| Landing | Modo oscuro |
|---|---|
| ![Landing](docs/capturas/01-landing.png) | ![Modo oscuro](docs/capturas/11-admin-dashboard-oscuro.png) |

## Qué puede hacer cada rol

| Rol | Funciones |
|---|---|
| **SuperAdmin** | Ver todas las academias registradas y activarlas o suspenderlas. Si una academia está suspendida, sus usuarios no pueden iniciar sesión. |
| **Todos** | Iniciar sesión y recuperar la contraseña con un enlace que llega al correo. |
| **Admin de academia** | Registrar su academia, gestionar salones, ritmos y tarifas, crear, editar y desactivar profesores y estudiantes, programar y cancelar clases (lista o calendario semanal), registrar pagos, ver quién está al día, ver los reportes de ocupación, ingresos y asistencia, revisar la bitácora de cambios y preguntarle al asistente de IA sobre los datos de su academia (opcional). |
| **Profesor** | Ver sus clases de hoy y las próximas, y tomar asistencia (asistió, inasistencia, excusa) el día de la clase, a mano o escaneando el QR del estudiante. |
| **Estudiante** | Ver el catálogo con cupos en tiempo real y filtros por ritmo y día, reservar y cancelar (el cupo queda libre para otro), mostrar el QR de su reserva, ver su historial de asistencia, sus pagos y hasta cuándo está vigente su membresía. |

## Stack

| Capa | Tecnologías |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS 4, React Router, Recharts, Framer Motion, qrcode y jsQR |
| Backend | Node.js, Express 5, JWT, bcrypt, helmet, express-rate-limit, correo por la API de Brevo, asistente con la API de Claude (opcional) |
| Datos | PostgreSQL 16, Prisma 7 (driver adapter `@prisma/adapter-pg`) |
| Pruebas y CI | Jest, Supertest, Vitest, Testing Library, GitHub Actions, Dependabot, SonarCloud |
| Entorno | Docker Compose (PostgreSQL + pgAdmin) |

Arquitectura de tres capas: el frontend nunca toca la base de datos, todo pasa por la API REST. La decisión está documentada en [`docs/adr/ADR-001-arquitectura-tres-capas.md`](docs/adr/ADR-001-arquitectura-tres-capas.md). Dentro de la API no hay capas de servicios ni repositorios separadas ([ADR-002](docs/adr/ADR-002-controladores-y-prisma-sin-capa-de-servicios.md)) y el correo sale por la API de Brevo ([ADR-003](docs/adr/ADR-003-correo-por-api-http-brevo.md)). El asistente de IA del administrador es opcional, solo lee los reportes de su academia y no envía correos ni teléfonos ([ADR-004](docs/adr/ADR-004-asistente-ia-del-administrador.md)).

## Despliegue

| Capa | Servicio | Configuración |
|---|---|---|
| Frontend | Vercel | Carpeta `frontend`, variables `VITE_API_URL` y `VITE_MODO_DEMO`. Se publica solo con cada merge a `main`. |
| API | Render (Ohio) | Definida como código en [`render.yaml`](render.yaml). La demo pública arranca con `npm run start:demo`: aplica migraciones y recarga los datos de demo. |
| Base de datos | Neon, PostgreSQL 16 (Ohio) | Misma región que la API. La cadena de conexión solo vive en las variables de Render, nunca en el repositorio. |
| Tareas diarias | cron-job.org (respaldo: GitHub Actions) | cron-job.org llama a `POST /api/tareas/diarias` todos los días a las 7:15 a. m. con el encabezado `Authorization: Bearer TAREAS_TOKEN`, y avisa por correo si falla. [`tareas-diarias.yml`](.github/workflows/tareas-diarias.yml) queda de respaldo: GitHub la corre con horas de retraso (hacia las 11:30 a. m.) y, como los correos ya enviados se anotan, no se repiten. |
| Monitor de la demo | cron-job.org | Consulta `/api/health` cada 10 minutos de 7:00 a. m. a 9:00 p. m. y avisa por correo si falla dos veces seguidas. |

Antes la demo se mantenía despierta con un workflow programado de GitHub Actions cada 5 minutos, pero GitHub retrasa y salta las ejecuciones programadas en los repositorios gratuitos: en dos días corrió 8 veces en vez de unas 300. Por eso se cambió a un monitor externo. Con las tareas diarias pasó lo mismo: programadas para las 7:00 a. m., corrían hacia las 11:30, así que desde el 22/10/2026 también las lanza cron-job.org.

`main` está protegida: todo cambio entra por Pull Request con revisión y con las pruebas de CI en verde.

### Instalación para una academia real

La demo pública recarga sus datos en cada arranque y crea cuentas con la contraseña de prueba. Una academia real no puede arrancar así:

1. En Render, usar como comando de inicio `npm run start:produccion` (solo aplica migraciones y enciende la API, sin datos de demo).
2. Crear la cuenta SuperAdmin una sola vez, desde la consola de Render (Shell) o con la base apuntada desde local:
   ```bash
   SUPERADMIN_EMAIL=correo@real.co SUPERADMIN_PASSWORD='una-clave-larga' npm run crear:superadmin
   ```
   La contraseña no puede ser la de prueba y queda guardada solo cifrada.
3. Registrar la academia desde la página de inicio (registro público) y aceptar la política de datos.

Como protección, en producción (`NODE_ENV=production`) los seeds se niegan a correr si no se les pasa `--permitir-demo`, que solo usa `start:demo`.

## Cómo correrlo en local

Requisitos: Node.js 20+ y Docker Desktop.

```bash
# 1. Base de datos (PostgreSQL + pgAdmin)
docker compose up -d

# 2. Backend
cd backend
npm install
cp .env.example .env          # los valores por defecto funcionan con el docker-compose
npx prisma generate
npx prisma migrate dev
npm run prisma:seed           # usuarios base
npm run prisma:seed:demo      # opcional: academia con una agenda completa de ejemplo
npm run dev                   # API en http://localhost:4000/api

# 3. Frontend (en otra terminal)
cd frontend
npm install
npm run dev                   # http://localhost:5173
```

pgAdmin queda en `http://localhost:5051` (correo `admin@ritmoapp.dev`, contraseña `admin`).

### Usuarios de prueba

Todos con la contraseña `Prueba123!`

| Rol | Correo |
|---|---|
| Admin de academia | `admin@ritmocentral.test` |
| Profesor | `profesor@ritmocentral.test` |
| Estudiante | `estudiante@ritmocentral.test` |
| SuperAdmin | `superadmin@ritmoapp.test` |

## Pruebas

Usan una base de datos aparte (`ritmoapp_test`) para no tocar los datos de desarrollo.

```bash
cd backend

# Solo la primera vez
docker exec ritmoapp_db createdb -U ritmoapp ritmoapp_test
DATABASE_URL="postgresql://ritmoapp:ritmoapp_dev@localhost:5432/ritmoapp_test?schema=public" npx prisma migrate deploy

npm test                      # o npm run test:coverage

# Frontend (no necesita base de datos: usa una API falsa)
cd ../frontend
npm test
```

Cubren los requisitos construidos: registro de academia, inicio de sesión (incluido el límite de intentos), recuperación de contraseña, panel del SuperAdmin, gestión de profesores y estudiantes, tarifas, programación de clases, catálogo con filtros, reservas y cancelaciones (incluida la prueba de concurrencia y el cruce de horarios), membresías y pagos, asistencia (también por QR), historial de asistencia, reportes, bitácora, correos y tareas diarias, autorización de datos, arranque de producción y asistente de IA (con un cliente simulado, sin llamar a la API real). También cubren el aislamiento entre academias. Cada prueba lleva su código de caso de prueba (CP-001 a CP-195) para la matriz de trazabilidad del proyecto.

## API

Todas las rutas van bajo `/api`. Salvo `auth`, `health` y `tareas`, requieren `Authorization: Bearer <token>`.

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/health` | Público | Estado de la API |
| POST | `/auth/onboarding` | Público | Registra una academia y su administrador |
| POST | `/auth/login` | Público | Inicia sesión y devuelve el JWT |
| POST | `/auth/recuperar`, `/auth/restablecer` | Público | Envía el enlace de recuperación / cambia la contraseña |
| GET / PATCH | `/superadmin/tenants`, `/superadmin/tenants/:id/estado` | SuperAdmin | Lista academias / activa o suspende |
| GET / POST / PUT / DELETE | `/salones`, `/ritmos`, `/tarifas` | Admin | Catálogo de la academia |
| GET / POST / PATCH | `/usuarios`, `/usuarios/:id` | Admin | Lista, crea, edita y desactiva profesores y estudiantes |
| GET | `/clases` | Cualquier rol de la academia | Catálogo de clases con cupos |
| POST | `/clases` | Admin | Programa una clase (valida cruces y capacidad) |
| PATCH | `/clases/:id/cancelar` | Admin | Cancela una clase y avisa a los inscritos |
| GET / POST | `/clases/:id/inscritos`, `/clases/:id/asistencia` | Profesor asignado | Lista de inscritos / registro de asistencia |
| POST | `/reservas` | Estudiante | Reserva un cupo |
| GET | `/reservas/mias` | Estudiante | Sus reservas |
| PATCH | `/reservas/:id/cancelar` | Estudiante | Cancela su reserva y libera el cupo |
| GET | `/asistencias/mias` | Estudiante | Su historial de asistencia |
| GET | `/qr/reservas/:id` | Estudiante | Código QR de su reserva |
| POST | `/qr/clases/:id/asistencia` | Profesor asignado | Registra la asistencia con el código escaneado |
| GET / POST | `/pagos`, `/pagos/membresias` | Admin | Pagos y estado de membresía de cada estudiante / registra un pago |
| GET | `/pagos/mios` | Estudiante | Sus pagos |
| GET | `/reportes/ocupacion`, `/reportes/ingresos`, `/reportes/asistencia` | Admin | Reportes por rango (`?desde=YYYY-MM-DD&hasta=YYYY-MM-DD`) |
| GET | `/bitacora` | Admin | Últimos 200 cambios de la academia |
| GET / POST | `/asistente/estado`, `/asistente` | Admin | Si el asistente de IA está activo / responde una pregunta con los reportes de la academia (20 por hora) |
| POST | `/tareas/diarias` | Token `TAREAS_TOKEN` | Recordatorios y avisos de membresía del día |

## Estructura

```
RitmoApp/
├── .github/
│   ├── workflows/ci.yml       # Pruebas, cobertura mínima y build en cada push
│   ├── workflows/tareas-diarias.yml  # Recordatorios por correo cada mañana
│   └── dependabot.yml         # Revisión semanal de dependencias
├── docker-compose.yml         # PostgreSQL + pgAdmin para desarrollo
├── backend/
│   ├── prisma/                # Esquema, migraciones, seed y seed de demo
│   ├── src/
│   │   ├── config/            # Cliente de Prisma y cliente aislado por academia
│   │   ├── middlewares/       # JWT, roles, tenant, rate limit
│   │   ├── controllers/
│   │   ├── routes/
│   │   └── utils/
│   ├── scripts/               # crear:superadmin y medición de rendimiento
│   └── tests/                 # Jest + Supertest contra ritmoapp_test
├── frontend/
│   └── src/
│       ├── api/               # Cliente HTTP
│       ├── context/           # Sesión y tema (claro/oscuro)
│       ├── components/        # UI compartida, calendario, gráfica, QR
│       ├── pages/             # Una carpeta por rol
│       └── test/              # Configuración de Vitest y API falsa
└── docs/
    ├── adr/                   # Decisiones de arquitectura
    └── capturas/
```

## Contexto del proyecto

Proyecto formativo de la Tecnología en Análisis y Desarrollo de Software del SENA (ficha 3229209). El análisis y el diseño (requisitos, historias de usuario, diagramas y arquitectura) se hicieron en equipo con Davier Andrés Quinto Bejarano. La implementación de este repositorio la hizo **Manuela Córdoba Robledo**.

[LinkedIn](https://www.linkedin.com/in/manuela-cordoba-dev/) · [GitHub](https://github.com/robledocordoba123-cmyk) · robledocordoba123@gmail.com
