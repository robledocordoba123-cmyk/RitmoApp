# RitmoApp

![CI](https://github.com/robledocordoba123-cmyk/RitmoApp/actions/workflows/ci.yml/badge.svg)

Plataforma SaaS multi-academia para que las escuelas de baile gestionen clases, horarios, cupos, reservas y asistencia, en lugar de hacerlo con cuadernos, Excel y grupos de WhatsApp.

> **Proyecto de grado** de la Tecnología en Análisis y Desarrollo de Software del SENA (ficha 3229209).

Cada academia se registra sola y trabaja con sus datos totalmente aislados de las demás. Hay cuatro roles: **SuperAdmin** (dueño de la plataforma), **Admin de academia**, **Profesor** y **Estudiante**.

### 🌐 Demo en vivo: **[ritmoapp-demo.vercel.app](https://ritmoapp-demo.vercel.app)**

En la pantalla de inicio de sesión puedes entrar con un clic como **Administrador**, **Profesor** o **Estudiante** de una academia de ejemplo con su agenda de clases. Los datos de la demo se restablecen solos.

> La API está en un plan gratuito que se apaga tras 15 minutos sin uso: si nadie la ha abierto en un rato, la primera entrada puede tardar cerca de un minuto.

![Panel del administrador](docs/capturas/03-admin-dashboard.png)

## Lo más interesante técnicamente

- **Aislamiento multi-tenant a nivel de ORM.** Una extensión de Prisma ([`tenantPrismaClient.js`](backend/src/config/tenantPrismaClient.js)) agrega el `tenantId` del usuario autenticado a *todas* las consultas de los modelos de negocio. Si alguien olvida filtrar por academia en un controlador, el cliente lo hace igual. Hay pruebas con dos academias que intentan leer y modificar datos de la otra.
- **Sin sobrecupo bajo concurrencia.** La reserva descuenta el cupo con un `UPDATE` condicional atómico (`WHERE cuposDisponibles > 0`) dentro de una transacción. Una prueba lanza dos solicitudes al mismo tiempo por el último cupo y verifica que solo una gana.
- **Reglas de agenda.** No se puede programar una clase si el salón o el profesor ya tienen otra en ese horario, ni con más cupos que la capacidad del salón.
- **Zonas horarias.** "Hoy" y los rangos de los reportes se calculan en hora de Colombia, no en UTC (una clase de 6:00 p. m. en Bogotá ya es "mañana" en UTC).
- **Seguridad.** JWT + bcrypt, control de acceso por rol, rate limiting en el login y el registro, `helmet`, CORS restringido por entorno y la API no arranca si faltan variables obligatorias.
- **47 pruebas automatizadas** (Jest + Supertest) contra PostgreSQL real, sin mocks, que corren en GitHub Actions en cada push.

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
| **Admin de academia** | Registrar su academia, gestionar salones y ritmos, dar de alta profesores y estudiantes, programar y cancelar clases (lista o calendario semanal) y ver el reporte de ocupación. |
| **Profesor** | Ver sus clases de hoy y las próximas, y tomar asistencia (asistió, inasistencia, excusa) el día de la clase. |
| **Estudiante** | Ver el catálogo con cupos en tiempo real, reservar y cancelar su reserva (el cupo queda libre para otro). |

## Stack

| Capa | Tecnologías |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS 4, React Router, Recharts, Framer Motion |
| Backend | Node.js, Express 5, JWT, bcrypt, helmet, express-rate-limit |
| Datos | PostgreSQL 16, Prisma 7 (driver adapter `@prisma/adapter-pg`) |
| Pruebas y CI | Jest, Supertest, GitHub Actions |
| Entorno | Docker Compose (PostgreSQL + pgAdmin) |

Arquitectura de tres capas: el frontend nunca toca la base de datos, todo pasa por la API REST. La decisión está documentada en [`docs/adr/ADR-001-arquitectura-tres-capas.md`](docs/adr/ADR-001-arquitectura-tres-capas.md).

## Despliegue

| Capa | Servicio | Configuración |
|---|---|---|
| Frontend | Vercel | Carpeta `frontend`, variables `VITE_API_URL` y `VITE_MODO_DEMO`. Se publica solo con cada merge a `main`. |
| API | Render (Ohio) | Definida como código en [`render.yaml`](render.yaml). Al arrancar aplica migraciones y recarga los datos de demo. |
| Base de datos | Neon, PostgreSQL 16 (Ohio) | Misma región que la API. La cadena de conexión solo vive en las variables de Render, nunca en el repositorio. |

`main` está protegida: todo cambio entra por Pull Request con revisión y con las pruebas de CI en verde.

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

pgAdmin queda en `http://localhost:5051` (correo `admin@ritmoapp.local`, contraseña `admin`).

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

npm test
```

Cubren los ocho requisitos funcionales: onboarding, login, panel del SuperAdmin, catálogo de salones y ritmos, programación de clases, reservas y cancelaciones (incluida la prueba de concurrencia), asistencia y reportes. También cubren el aislamiento entre academias.

## API

Todas las rutas van bajo `/api`. Salvo `auth` y `health`, requieren `Authorization: Bearer <token>`.

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/auth/onboarding` | Público | Registra una academia y su administrador |
| POST | `/auth/login` | Público | Inicia sesión y devuelve el JWT |
| GET / PATCH | `/superadmin/tenants`, `/superadmin/tenants/:id/estado` | SuperAdmin | Lista academias / activa o suspende |
| GET / POST / PUT / DELETE | `/salones`, `/ritmos` | Admin | Catálogo de la academia |
| GET / POST | `/usuarios` | Admin | Lista y crea profesores y estudiantes |
| GET | `/clases` | Cualquier rol de la academia | Catálogo de clases con cupos |
| POST | `/clases` | Admin | Programa una clase (valida cruces y capacidad) |
| PATCH | `/clases/:id/cancelar` | Admin | Cancela una clase |
| GET / POST | `/clases/:id/inscritos`, `/clases/:id/asistencia` | Profesor asignado | Lista de inscritos / registro de asistencia |
| POST | `/reservas` | Estudiante | Reserva un cupo |
| GET | `/reservas/mias` | Estudiante | Sus reservas |
| PATCH | `/reservas/:id/cancelar` | Estudiante | Cancela su reserva y libera el cupo |
| GET | `/reportes/ocupacion?desde=YYYY-MM-DD&hasta=YYYY-MM-DD` | Admin | Ocupación por salón |

## Estructura

```
RitmoApp/
├── .github/workflows/ci.yml   # Pruebas + build en cada push
├── docker-compose.yml         # PostgreSQL + pgAdmin para desarrollo
├── backend/
│   ├── prisma/                # Esquema, migraciones, seed y seed de demo
│   ├── src/
│   │   ├── config/            # Cliente de Prisma y cliente aislado por academia
│   │   ├── middlewares/       # JWT, roles, tenant, rate limit
│   │   ├── controllers/
│   │   ├── routes/
│   │   └── utils/
│   └── tests/                 # Jest + Supertest contra ritmoapp_test
├── frontend/
│   └── src/
│       ├── api/               # Cliente HTTP
│       ├── context/           # Sesión y tema (claro/oscuro)
│       ├── components/        # UI compartida, calendario, gráfica
│       └── pages/             # Una carpeta por rol
└── docs/
    ├── adr/                   # Decisiones de arquitectura
    └── capturas/
```

## Contexto del proyecto

Proyecto formativo de la Tecnología en Análisis y Desarrollo de Software del SENA (ficha 3229209). El análisis y el diseño (requisitos, historias de usuario, diagramas y arquitectura) se hicieron en equipo con Davier Andrés Quinto Bejarano. La implementación de este repositorio la hizo **Manuela Córdoba Robledo**.

[LinkedIn](https://www.linkedin.com/in/manuela-cordoba-dev/) · [GitHub](https://github.com/robledocordoba123-cmyk) · robledocordoba123@gmail.com
