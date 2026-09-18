# ADR-001 · Arquitectura de tres capas para RitmoApp

- **Estado:** Aceptada
- **Fecha:** 14/08/2026 (decisión tomada en GA1; formalizada como ADR en GA2; confirmada con el stack técnico definido en la asignatura de Documentación)
- **Responsables:** Equipo RitmoApp — Manuela Córdoba Robledo, Davier Andrés Quinto Bejarano (equipo vigente); Alejandro Roque Morales participó en la decisión original antes de su salida de la ficha.

## Contexto

RitmoApp es una plataforma SaaS multi-academia: varias academias de baile independientes usan el mismo sistema, cada una con sus propios usuarios, clases, horarios y pagos, y sus datos deben quedar aislados entre sí (RN-04). El sistema tiene tres roles con necesidades muy distintas (estudiante, profesor, administrador) más un SuperAdministrador que gestiona las academias registradas.

El equipo necesitaba una arquitectura que:

- Permitiera separar claramente la interfaz, la lógica de negocio (reglas de agendamiento, validación de cupos, control de membresías) y el almacenamiento de datos.
- Fuera manejable para un equipo pequeño y un proyecto formativo de un trimestre, sin la complejidad operativa de desplegar y coordinar múltiples servicios independientes.
- Tuviera curva de aprendizaje razonable con el stack que el equipo ya maneja (JavaScript en frontend y backend).

## Decisión

Se adopta una **arquitectura de tres capas** (presentación, lógica de negocio/API, datos), implementada con:

- **Frontend:** React + Tailwind CSS — renderiza el catálogo de clases, los formularios de agendamiento y los cuatro paneles por rol (SuperAdmin, Admin de academia, Profesor, Estudiante).
- **Backend:** Node.js con Express — expone los endpoints REST, valida las peticiones y ejecuta las reglas de negocio (cupo disponible, cruce de horario, membresía vigente).
- **Base de datos:** PostgreSQL, administrada mediante Prisma ORM — persiste usuarios, roles, academias, salones, ritmos, clases, horarios, reservas y asistencia.
- **Autenticación:** JWT + bcrypt, para mantener la sesión del usuario sin estado en el servidor.
- **Despliegue de pruebas:** Vercel (frontend) y Render (backend/BD), ambos en capa gratuita.

La comunicación entre capas es siempre descendente y por API: el frontend nunca accede directamente a la base de datos, siempre pasa por el backend. Esto es lo que verifican los diagramas de secuencia de P04.

## Alternativas consideradas

| Alternativa | Por qué no se eligió |
|---|---|
| **Monolito sin separación de capas** (todo en un solo proyecto sin frontera clara entre UI, lógica y datos) | Dificulta el trabajo en paralelo del equipo y mezcla reglas de negocio con la interfaz, lo que complica probar cada regla de forma aislada. |
| **Microservicios** (un servicio por dominio: usuarios, agendamiento, pagos) | Introduce complejidad operativa (despliegue, comunicación entre servicios, consistencia de datos) que no se justifica para el volumen de usuarios esperado ni para un equipo pequeño en un trimestre. |
| **Arquitectura event-driven** | El flujo principal del negocio (agendar → confirmar → notificar) es mayormente síncrono y no tiene todavía un volumen de eventos que justifique un bus de mensajería. |

## Consecuencias

**Positivas**

- El equipo puede dividir el trabajo por capa: quien construye el frontend no bloquea a quien construye la API, siempre que el contrato de endpoints (derivado de los diagramas de secuencia de P04) esté acordado primero.
- Las reglas de negocio críticas (RN-01 a RN-04: cupo, cruce de salón, cruce de profesor, aislamiento por academia) viven en un solo lugar (el backend), evitando que se dupliquen o contradigan entre frontend y servidor.
- Es más simple de desplegar y depurar que una arquitectura distribuida, lo cual reduce el riesgo para un proyecto formativo con fecha de entrega fija.
- Prisma da migraciones versionadas y un cliente tipado, lo que reduce errores manuales de SQL en las consultas multi-tenant.

**Negativas / riesgos aceptados**

- Todo el backend crece como una sola aplicación: si el volumen de academias creciera mucho, escalar por dominio (por ejemplo, separar pagos del resto) requeriría una migración posterior hacia servicios independientes.
- El aislamiento de datos entre academias (RN-04 / RNF-01) depende de que cada consulta a PostgreSQL filtre correctamente por `tenantId`; un error de implementación en el backend podría filtrar datos entre academias. Se mitiga con un middleware que inyecta el `tenantId` del usuario autenticado en cada operación (pendiente de implementar — ver README, sección "Lo que sigue").
- La concurrencia sobre el último cupo disponible (RN-01) requiere transacciones explícitas en el motor de agendamiento; si se implementa sin transacción atómica, es posible el overbooking.

## Referencias

- P03 · Modelado de procesos (03_Diseño del paquete de entrega SENA) — procesos que esta arquitectura automatiza.
- P04 · Diagramas de secuencia y actividades — verifica que ningún diagrama salta de capa.
- RitmoApp – Alcance y Especificación de Requisitos v2 (asignatura Documentación) — stack técnico aprobado por el instructor evaluador, sección 6.1.
- RN-04 (aislamiento de datos entre academias) y RNF-01 (aislamiento multi-tenant obligatorio vía middleware).
