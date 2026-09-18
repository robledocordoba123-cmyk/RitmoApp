# RitmoApp

Plataforma SaaS multi-tenant para que academias de baile gestionen clases, horarios, cupos, inscripciones y asistencia, reemplazando cuadernos, Excel y WhatsApp.

Proyecto formativo — SENA, Análisis y Desarrollo de Software, Ficha 3229209.

## Stack

- **Backend:** Node.js + Express 5
- **ORM / Base de datos:** Prisma 7 + PostgreSQL (driver adapter `@prisma/adapter-pg`)
- **Autenticación:** JWT + bcrypt
- **Frontend:** React + Tailwind CSS (pendiente de scaffolding)
- **Infraestructura de desarrollo:** Docker Compose (PostgreSQL + pgAdmin)
- **Despliegue objetivo:** Vercel (frontend) + Render (backend/BD)

## Requisitos previos

- Node.js 20+
- Docker Desktop corriendo

## Cómo levantar el entorno de desarrollo (RNF-05)

```bash
# 1. Levantar PostgreSQL + pgAdmin
docker compose up -d

# 2. Instalar dependencias del backend
cd backend
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# (los valores por defecto ya funcionan con el docker-compose de este repo)

# 4. Generar el cliente de Prisma y aplicar las migraciones
npx prisma generate
npx prisma migrate dev

# 5. Cargar datos de prueba
npm run prisma:seed

# 6. Levantar la API en modo desarrollo
npm run dev
```

La API queda disponible en `http://localhost:4000/api`. pgAdmin queda en `http://localhost:5051` (correo `admin@ritmoapp.local`, contraseña `admin`).

### Usuarios de prueba (creados por el seed)

| Rol | Correo | Contraseña |
|---|---|---|
| Admin de academia | `admin@ritmocentral.test` | `Prueba123!` |
| Profesor | `profesor@ritmocentral.test` | `Prueba123!` |
| Estudiante | `estudiante@ritmocentral.test` | `Prueba123!` |

## Estructura del repositorio

```
RitmoApp/
├── docker-compose.yml       # PostgreSQL + pgAdmin para desarrollo
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma    # Modelo de datos multi-tenant
│   │   ├── migrations/
│   │   └── seed.js
│   ├── prisma.config.cjs    # Conexión que usa el CLI de Prisma (Prisma 7)
│   └── src/
│       ├── server.js
│       ├── app.js
│       ├── config/          # Cliente de Prisma con el driver adapter
│       ├── middlewares/     # Auth (JWT) y control de roles
│       ├── controllers/
│       └── routes/
├── frontend/                 # Pendiente
└── docs/adr/                 # Decisiones de arquitectura
```

## Arquitectura y decisiones

Ver [`docs/adr/ADR-001-arquitectura-tres-capas.md`](docs/adr/ADR-001-arquitectura-tres-capas.md).

## Reglas de negocio implementadas hasta ahora

- **RF-01** Onboarding de academia (tenant) + administrador inicial, rechaza NIT o correo duplicado.
- **RF-02** Login con JWT que incluye rol y `tenantId`.
- **RF-04** CRUD de salones y ritmos, aislado por academia.
- **RF-05 / RN-02 / RN-03** Programación de clases: rechaza cruces de horario en el mismo salón y del mismo profesor.
- **RF-06 / RN-01** Reserva de cupo con decremento atómico — probado con dos solicitudes simultáneas por el último cupo, sin overbooking.
- **RF-07** Registro de asistencia por el profesor asignado, solo el día de la clase.
- **RNF-01** Aislamiento multi-tenant: extensión de Prisma que inyecta `tenantId` en toda consulta de los modelos de negocio (`src/config/tenantPrismaClient.js`), probado con dos academias distintas.
- **RNF-02** Transacciones atómicas en el motor de agendamiento (`reserva.controller.js`).

Todo lo anterior está probado en vivo contra PostgreSQL, no solo escrito.

Lo que sigue: panel de SuperAdmin (RF-03), reportes de ocupación (RF-08), pruebas automatizadas, y luego el frontend (React + Tailwind).
