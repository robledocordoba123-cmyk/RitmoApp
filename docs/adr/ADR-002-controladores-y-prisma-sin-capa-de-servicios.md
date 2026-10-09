# ADR-002 · Controladores y Prisma, sin capas separadas de servicios y repositorios

- **Estado:** Aceptada
- **Fecha:** 08/10/2026 (registra una decisión que se tomó durante la construcción, entre septiembre y octubre de 2026)
- **Responsables:** Manuela Córdoba Robledo, Davier Andrés Quinto Bejarano
- **Relación:** complementa a [ADR-001](ADR-001-arquitectura-tres-capas.md). Las tres capas se mantienen; esta decisión trata solo de cómo se organiza el código dentro de la capa de la API.

## Contexto

El diseño de T5 (P04 v1.5 y C4-03 v1.0) dividía la API en cuatro capas internas: rutas, controladores, servicios de negocio y repositorios de acceso a datos. Al construir el sistema, la mayoría de los endpoints resultaron cortos: validan los datos, aplican una o dos reglas de negocio y hacen una o dos consultas.

Además, el riesgo más grave de un SaaS multi-academia es que un error en una consulta deje ver datos de otra academia (RN-04, RNF-01). Ese aislamiento tenía que quedar en un solo lugar, no repartido en cada repositorio.

## Decisión

- Cada endpoint tiene su **ruta** (`routes/`), pasa por los **middlewares de seguridad** (`middlewares/`: JWT, rol y academia) y lo atiende un **controlador** (`controllers/`) que valida los datos y aplica las reglas de negocio.
- La lógica que se repite en más de un controlador vive en **`utils/`** (por ejemplo `membresia.js`, usada al reservar y al registrar pagos, y `validaciones.js`).
- **Prisma** es la capa de acceso a datos. No se escriben repositorios propios.
- El aislamiento por academia se centraliza en `config/tenantPrismaClient.js`: el middleware `requireTenant` crea `req.db`, un cliente de Prisma que agrega el `tenantId` a todas las consultas de los modelos de una academia. Los controladores usan siempre `req.db`.
- Las operaciones que no pueden quedar a medias (reservar el último cupo, registrar un pago, cancelar) usan **transacciones** de Prisma, con actualizaciones condicionales o bloqueo de fila.

## Alternativas consideradas

| Alternativa | Por qué no se eligió |
|---|---|
| **Servicios y repositorios separados** (diseño de T5) | Con endpoints cortos, cada caso de uso quedaba repartido en tres archivos que solo se pasaban los datos entre sí. Más código que leer y probar, sin una regla que se reutilizara. |
| **Filtrar por `tenantId` a mano en cada consulta** | Un solo olvido filtraría datos entre academias. Centralizarlo en el cliente de Prisma hace que sea imposible olvidarlo en los modelos multi-academia. |

## Consecuencias

**Positivas**

- Cada caso de uso se lee de principio a fin en un solo controlador, lo que facilita explicarlo y revisarlo.
- El aislamiento entre academias está en un solo archivo y lo verifican las pruebas CP-045 a CP-047.
- Las pruebas automatizadas (85 en octubre de 2026) prueban cada endpoint completo contra una base de datos real, sin simular capas.

**Negativas / riesgos aceptados**

- Si un controlador crece mucho, su lógica debe moverse a `utils/` o a un servicio; esta decisión se revisa si algún controlador supera unas 200 líneas.
- El modelo `User` no está en el cliente aislado, porque el inicio de sesión busca por correo sin conocer todavía la academia. Las consultas de usuarios filtran el `tenantId` a mano (por ejemplo en `usuario.controller.js` y `pago.controller.js`).

## Referencias

- C4-03 v2.0 (componentes MOD-01 a MOD-05) y P04 v2.0, sección A.3.
- `backend/src/config/tenantPrismaClient.js`, `backend/src/middlewares/tenant.js`.
