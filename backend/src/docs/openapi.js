// Documentación de la API en formato OpenAPI 3.0 (deuda técnica 1 de DOC-13).
// Se sirve en /api/docs (Swagger UI, para verla y probarla en el navegador) y
// en /api/docs/openapi.json (el archivo, para importarlo en Postman u otras
// herramientas). La prueba tests/openapi.test.js revisa que cada ruta que
// existe en src/routes esté descrita aquí, así que si se agrega una ruta nueva
// sin documentarla, la prueba falla.
const { LONGITUD_MINIMA_PASSWORD, LONGITUD_MAXIMA_NOMBRE } = require("../utils/validaciones");

// ---------------------------------------------------------------------------
// Piezas que se repiten
// ---------------------------------------------------------------------------

const ref = (nombre) => ({ $ref: `#/components/schemas/${nombre}` });
const lista = (nombre) => ({ type: "array", items: ref(nombre) });
const json = (schema, example) => ({ "application/json": { schema, ...(example ? { example } : {}) } });
const cuerpo = (schema, example) => ({ required: true, content: json(schema, example) });

function ok(descripcion, schema, example) {
  return { description: descripcion, content: json(schema, example) };
}

function error(descripcion) {
  return { description: descripcion, content: json(ref("Error")) };
}

const parametroId = (descripcion) => ({
  name: "id",
  in: "path",
  required: true,
  description: descripcion,
  schema: { type: "string", format: "uuid" },
});

const parametroFecha = (nombre, descripcion) => ({
  name: nombre,
  in: "query",
  required: true,
  description: descripcion,
  schema: { type: "string", format: "date", example: "2026-11-01" },
});

// Respuestas que da el middleware antes de llegar al controlador.
const SIN_SESION = { 401: { $ref: "#/components/responses/SinSesion" } };
const CON_ROL = { ...SIN_SESION, 403: { $ref: "#/components/responses/SinPermiso" } };
const DEMASIADOS_INTENTOS = { 429: { $ref: "#/components/responses/DemasiadosIntentos" } };
const NO_EXISTE = error("No existe en esta academia.");

// Reportes: todos piden el mismo rango de fechas y fallan igual sin él.
const RANGO_DE_FECHAS = [parametroFecha("desde", "Primer día (YYYY-MM-DD)."), parametroFecha("hasta", "Último día (YYYY-MM-DD).")];
const FECHAS_INVALIDAS = error("Fechas faltantes o inválidas.");

// Rutas públicas que reciben solo un correo y responden lo mismo exista o no.
const SOLO_CORREO = cuerpo({ type: "object", required: ["email"], properties: { email: { type: "string", format: "email" } } });
const RESPUESTAS_SOLO_CORREO = {
  200: ok("Solicitud recibida.", { $ref: "#/components/schemas/Mensaje" }),
  400: error("Falta el correo."),
  ...DEMASIADOS_INTENTOS,
};

// Una operación que necesita sesión. "roles" se muestra en la descripción para
// que se lea de un vistazo quién la puede usar.
const ADMIN_ACADEMIA = "Administrador de academia (ADMIN_ACADEMIA)";

function protegida(tag, resumen, roles, detalles = {}) {
  const descripcion = [`**Rol:** ${roles}.`, detalles.description].filter(Boolean).join("\n\n");
  return {
    tags: [tag],
    summary: resumen,
    ...detalles,
    description: descripcion,
    security: [{ bearerAuth: [] }],
    responses: { ...detalles.responses, ...CON_ROL },
  };
}

// Los tres reportes reciben el mismo rango y devuelven desde, hasta y sus datos.
function reporte(resumen, descripcion, datos) {
  return protegida("Reportes", resumen, ADMIN_ACADEMIA, {
    parameters: RANGO_DE_FECHAS,
    responses: {
      200: ok(descripcion, { type: "object", properties: { desde: { type: "string" }, hasta: { type: "string" }, ...datos } }),
      400: FECHAS_INVALIDAS,
    },
  });
}

// Borrar un elemento del catálogo de la academia. conflicto: por qué no se puede.
function eliminar(tag, resumen, descripcionId, conflicto) {
  return protegida(tag, resumen, ADMIN_ACADEMIA, {
    parameters: [parametroId(descripcionId)],
    responses: { 204: { description: "Eliminado." }, 404: NO_EXISTE, 409: error(conflicto) },
  });
}

function publica(tag, resumen, detalles = {}) {
  return { tags: [tag], summary: resumen, security: [], ...detalles };
}

// ---------------------------------------------------------------------------
// Esquemas (lo que entra y sale de la API)
// ---------------------------------------------------------------------------

const fecha = { type: "string", format: "date-time" };
const uuid = { type: "string", format: "uuid" };

const schemas = {
  Error: {
    type: "object",
    required: ["error"],
    properties: {
      error: { type: "string", description: "Mensaje claro para mostrar al usuario." },
      codigo: { type: "string", description: "Solo en algunos errores, para que el frontend sepa qué pantalla mostrar." },
    },
    example: { error: "No tienes permiso para esta acción." },
  },
  Mensaje: {
    type: "object",
    properties: { mensaje: { type: "string" } },
  },
  Rol: { type: "string", enum: ["SUPERADMIN", "ADMIN_ACADEMIA", "PROFESOR", "ESTUDIANTE"] },
  UsuarioSesion: {
    type: "object",
    properties: {
      id: uuid,
      nombre: { type: "string" },
      rol: ref("Rol"),
      tenantId: { ...uuid, nullable: true, description: "null para el SuperAdmin, que no pertenece a ninguna academia." },
      fotoPerfil: { type: "string", nullable: true, description: "Data URL de la foto (HU-07)." },
    },
  },
  Membresia: {
    type: "object",
    description: "RN-05: se calcula con el pago de vigencia más lejana; no se guarda en la base de datos.",
    properties: {
      estado: { type: "string", enum: ["AL_DIA", "VENCIDA", "SIN_PAGOS"] },
      vigenteHasta: { ...fecha, nullable: true },
      diasRestantes: { type: "integer" },
    },
  },
  Salon: {
    type: "object",
    properties: {
      id: uuid,
      tenantId: uuid,
      nombre: { type: "string", example: "Salón Principal" },
      capacidad: { type: "integer", minimum: 1, example: 20 },
      activo: { type: "boolean" },
    },
  },
  Ritmo: {
    type: "object",
    properties: { id: uuid, tenantId: uuid, nombre: { type: "string", example: "Salsa" } },
  },
  Tarifa: {
    type: "object",
    properties: {
      id: uuid,
      tenantId: uuid,
      nombre: { type: "string", example: "Mensualidad" },
      valor: { type: "integer", minimum: 1, description: "En pesos colombianos, sin decimales.", example: 120000 },
      duracionDias: { type: "integer", minimum: 1, maximum: 366, example: 30 },
      activa: { type: "boolean" },
      createdAt: fecha,
    },
  },
  Clase: {
    type: "object",
    properties: {
      id: uuid,
      tenantId: uuid,
      ritmoId: uuid,
      salonId: uuid,
      profesorId: uuid,
      cupoMaximo: { type: "integer" },
      cuposDisponibles: { type: "integer", description: "Baja de forma atómica al reservar (RN-01)." },
      fechaHoraInicio: fecha,
      fechaHoraFin: fecha,
      estado: { type: "string", enum: ["PROGRAMADA", "CANCELADA"] },
      createdAt: fecha,
    },
  },
  ClaseDelCatalogo: {
    allOf: [
      ref("Clase"),
      {
        type: "object",
        properties: {
          ritmo: ref("Ritmo"),
          salon: ref("Salon"),
          profesor: { type: "object", properties: { id: uuid, nombre: { type: "string" } } },
        },
      },
    ],
  },
  Reserva: {
    type: "object",
    properties: {
      id: uuid,
      tenantId: uuid,
      claseId: uuid,
      estudianteId: uuid,
      estado: { type: "string", enum: ["CONFIRMADA", "CANCELADA"] },
      createdAt: fecha,
    },
  },
  EstadoAsistencia: { type: "string", enum: ["ASISTIO", "INASISTENCIA", "EXCUSA"] },
  Asistencia: {
    type: "object",
    properties: {
      id: uuid,
      tenantId: uuid,
      claseId: uuid,
      estudianteId: uuid,
      estado: ref("EstadoAsistencia"),
      registradoPorId: uuid,
      registradoEn: fecha,
    },
  },
  Pago: {
    type: "object",
    description: "Guarda su propia copia del nombre, valor y duración de la tarifa (HU-18-CA-03).",
    properties: {
      id: uuid,
      nombreTarifa: { type: "string" },
      monto: { type: "integer" },
      duracionDias: { type: "integer" },
      medio: { type: "string", enum: ["EFECTIVO", "TRANSFERENCIA", "TARJETA", "OTRO"] },
      referencia: { type: "string", nullable: true },
      vigenteDesde: fecha,
      vigenteHasta: fecha,
      registradoEn: fecha,
    },
  },
  UsuarioDeAcademia: {
    type: "object",
    properties: {
      id: uuid,
      nombre: { type: "string" },
      email: { type: "string", format: "email" },
      rol: { type: "string", enum: ["PROFESOR", "ESTUDIANTE"] },
      activo: { type: "boolean" },
      createdAt: fecha,
    },
  },
  Perfil: {
    type: "object",
    properties: {
      id: uuid,
      nombre: { type: "string" },
      email: { type: "string", format: "email" },
      rol: ref("Rol"),
      tenantId: { ...uuid, nullable: true },
      fotoPerfil: { type: "string", nullable: true },
    },
  },
  Invitacion: {
    type: "object",
    properties: {
      codigo: { type: "string", nullable: true, example: "K7M2QX9P" },
      venceEn: { ...fecha, nullable: true },
      vigente: { type: "boolean" },
    },
  },
  Academia: {
    type: "object",
    properties: {
      id: uuid,
      nombre: { type: "string" },
      nit: { type: "string" },
      estado: { type: "string", enum: ["ACTIVA", "SUSPENDIDA"] },
      createdAt: fecha,
      _count: { type: "object", properties: { usuarios: { type: "integer" } } },
    },
  },
  ConteoAsistencia: {
    type: "object",
    properties: {
      asistio: { type: "integer" },
      inasistencia: { type: "integer" },
      excusa: { type: "integer" },
      sinRegistrar: { type: "integer" },
      porcentajeAsistencia: {
        type: "integer",
        nullable: true,
        description: "Solo cuenta las clases con asistencia registrada; null si ninguna lo está.",
      },
    },
  },
};

// ---------------------------------------------------------------------------
// Rutas
// ---------------------------------------------------------------------------

const ADMIN = ADMIN_ACADEMIA;
const PROFESOR = "Profesor asignado a la clase (PROFESOR)";
const ESTUDIANTE = "Estudiante (ESTUDIANTE)";
const CUALQUIERA = "Cualquier usuario con sesión";

const paths = {
  "/health": {
    get: publica("Sistema", "Revisar que la API esté arriba", {
      description: "Lo usa Render para saber si el servicio está sano.",
      responses: { 200: ok("La API responde.", { type: "object" }, { estado: "ok" }) },
    }),
  },

  // --- Autenticación (rutas públicas, con límite de intentos por IP) ---
  "/auth/onboarding": {
    post: publica("Autenticación", "Registrar una academia y su administrador (RF-01 · HU-01)", {
      description:
        "La cuenta queda pendiente hasta que el administrador abra el enlace que le llega al correo (HU-06). " +
        "Límite: 5 registros por hora por IP.",
      requestBody: cuerpo(
        {
          type: "object",
          required: ["academia", "admin", "aceptaPoliticaDatos"],
          properties: {
            academia: {
              type: "object",
              required: ["nombre", "nit"],
              properties: { nombre: { type: "string" }, nit: { type: "string" } },
            },
            admin: {
              type: "object",
              description: "Los ejemplos no traen contraseña a propósito: escribe una de al menos 8 caracteres.",
              required: ["nombre", "email", "password"],
              properties: {
                nombre: { type: "string" },
                email: { type: "string", format: "email" },
                password: { type: "string", minLength: LONGITUD_MINIMA_PASSWORD },
              },
            },
            aceptaPoliticaDatos: { type: "boolean", enum: [true], description: "Ley 1581: debe ser true." },
          },
        },
        {
          academia: { nombre: "Academia Son de Barrio", nit: "900123456-7" },
          admin: { nombre: "Laura Gómez", email: "laura@academia.co" },
          aceptaPoliticaDatos: true,
        },
      ),
      responses: {
        201: ok("Academia creada; falta confirmar el correo.", {
          type: "object",
          properties: {
            mensaje: { type: "string" },
            tenant: { type: "object", properties: { id: uuid, nombre: { type: "string" }, nit: { type: "string" } } },
            confirmacionPendiente: { type: "boolean" },
            email: { type: "string" },
          },
        }),
        400: error("Faltan datos, la contraseña es corta o no se aceptó la política de datos."),
        409: error("Ya existe una academia con ese NIT o un usuario con ese correo."),
        ...DEMASIADOS_INTENTOS,
      },
    }),
  },
  "/auth/login": {
    post: publica("Autenticación", "Iniciar sesión (RF-04 · HU-04)", {
      description:
        "Devuelve el token JWT que se usa en las demás rutas (botón **Authorize**). Vence a las 8 horas. " +
        "Límite: 10 intentos cada 15 minutos por IP (RNF-07).",
      requestBody: cuerpo(
        {
          type: "object",
          required: ["email", "password"],
          properties: { email: { type: "string", format: "email" }, password: { type: "string" } },
        },
        { email: "admin@demo.ritmoapp.co" },
      ),
      responses: {
        200: ok("Sesión iniciada.", { type: "object", properties: { token: { type: "string" }, usuario: ref("UsuarioSesion") } }),
        400: error("Faltan el correo o la contraseña."),
        401: error("Credenciales inválidas, usuario inactivo o academia suspendida."),
        403: error("La cuenta no ha confirmado su correo (codigo: CORREO_SIN_CONFIRMAR)."),
        ...DEMASIADOS_INTENTOS,
      },
    }),
  },
  "/auth/recuperar": {
    post: publica("Autenticación", "Pedir el enlace para recuperar la contraseña (RF-05 · HU-05)", {
      description:
        "Responde lo mismo exista o no el correo, para no revelar qué correos están registrados. " +
        "El enlace vence a los 30 minutos y sirve una sola vez (RN-07).",
      requestBody: SOLO_CORREO,
      responses: RESPUESTAS_SOLO_CORREO,
    }),
  },
  "/auth/restablecer": {
    post: publica("Autenticación", "Crear la nueva contraseña con el enlace del correo (RF-05 · HU-05)", {
      requestBody: cuerpo({
        type: "object",
        required: ["token", "password"],
        properties: { token: { type: "string" }, password: { type: "string", minLength: LONGITUD_MINIMA_PASSWORD } },
      }),
      responses: {
        200: ok("Contraseña cambiada.", ref("Mensaje")),
        400: error("Enlace inválido, vencido o ya usado, o contraseña corta."),
        ...DEMASIADOS_INTENTOS,
      },
    }),
  },
  "/auth/confirmar": {
    post: publica("Autenticación", "Confirmar la cuenta con el enlace del correo (RF-06 · HU-06)", {
      description: "El enlace vence a las 24 horas y sirve una sola vez.",
      requestBody: cuerpo({ type: "object", required: ["token"], properties: { token: { type: "string" } } }),
      responses: {
        200: ok("Cuenta confirmada.", ref("Mensaje")),
        400: error("Enlace inválido, vencido o ya usado."),
        ...DEMASIADOS_INTENTOS,
      },
    }),
  },
  "/auth/reenviar-confirmacion": {
    post: publica("Autenticación", "Pedir otro enlace de confirmación (HU-06-CA-03)", {
      description: "Responde lo mismo exista o no el correo.",
      requestBody: SOLO_CORREO,
      responses: RESPUESTAS_SOLO_CORREO,
    }),
  },
  "/auth/invitacion/{codigo}": {
    get: publica("Autenticación", "Ver a qué academia pertenece un código de invitación (HU-22)", {
      parameters: [{ name: "codigo", in: "path", required: true, schema: { type: "string", example: "K7M2QX9P" } }],
      responses: {
        200: ok("Código válido.", { type: "object", properties: { academia: { type: "string" } } }),
        404: error("El código no existe, venció o la academia está suspendida."),
        ...DEMASIADOS_INTENTOS,
      },
    }),
  },
  "/auth/registro-estudiante": {
    post: publica("Autenticación", "Registrarse como estudiante con el código de la academia (RF-24 · HU-22)", {
      description: "La cuenta siempre queda con rol ESTUDIANTE y pendiente de confirmar el correo.",
      requestBody: cuerpo({
        type: "object",
        required: ["codigo", "nombre", "email", "password", "aceptaPoliticaDatos"],
        properties: {
          codigo: { type: "string" },
          nombre: { type: "string", maxLength: LONGITUD_MAXIMA_NOMBRE },
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: LONGITUD_MINIMA_PASSWORD },
          aceptaPoliticaDatos: { type: "boolean", enum: [true] },
          menorDeEdad: { type: "boolean" },
          autorizaRepresentante: { type: "boolean", description: "Obligatorio en true si menorDeEdad es true (HU-22-CA-03)." },
        },
      }),
      responses: {
        201: ok("Cuenta creada; falta confirmar el correo.", {
          type: "object",
          properties: {
            mensaje: { type: "string" },
            academia: { type: "string" },
            confirmacionPendiente: { type: "boolean" },
            email: { type: "string" },
          },
        }),
        400: error("Faltan datos, código inválido o falta la autorización de datos."),
        409: error("Ya existe una cuenta con ese correo."),
        ...DEMASIADOS_INTENTOS,
      },
    }),
  },

  // --- Perfil ---
  "/perfil": {
    get: protegida("Perfil", "Ver mi perfil (RF-07 · HU-07)", CUALQUIERA, {
      responses: { 200: ok("Datos del perfil.", ref("Perfil")), 404: error("Usuario no encontrado.") },
    }),
    patch: protegida("Perfil", "Editar mi nombre o mi foto (RF-07 · HU-07)", CUALQUIERA, {
      description: "El correo no se puede cambiar aquí porque es el usuario para iniciar sesión (HU-07-CA-03).",
      requestBody: cuerpo({
        type: "object",
        properties: {
          nombre: { type: "string", maxLength: 80 },
          fotoPerfil: {
            type: "string",
            nullable: true,
            description: "Data URL JPG, PNG o WebP de máximo 64 KB. null quita la foto.",
          },
        },
      }),
      responses: { 200: ok("Perfil actualizado.", ref("Perfil")), 400: error("Datos inválidos o no hay cambios.") },
    }),
  },

  // --- Configuración de la academia ---
  "/salones": {
    get: protegida("Salones", "Listar salones (RF-18 · HU-18)", ADMIN, {
      responses: { 200: ok("Salones de la academia.", lista("Salon")) },
    }),
    post: protegida("Salones", "Crear salón (RF-18 · HU-18)", ADMIN, {
      requestBody: cuerpo(
        {
          type: "object",
          required: ["nombre", "capacidad"],
          properties: { nombre: { type: "string" }, capacidad: { type: "integer", minimum: 1 } },
        },
        { nombre: "Salón Espejos", capacidad: 15 },
      ),
      responses: { 201: ok("Salón creado.", ref("Salon")), 400: error("Nombre vacío o capacidad inválida.") },
    }),
  },
  "/salones/{id}": {
    put: protegida("Salones", "Editar salón (RF-18 · HU-18)", ADMIN, {
      parameters: [parametroId("Id del salón.")],
      requestBody: cuerpo({
        type: "object",
        properties: { nombre: { type: "string" }, capacidad: { type: "integer", minimum: 1 }, activo: { type: "boolean" } },
      }),
      responses: { 200: ok("Salón actualizado.", ref("Salon")), 400: error("Datos inválidos."), 404: NO_EXISTE },
    }),
    delete: eliminar("Salones", "Eliminar salón (RF-18 · HU-18)", "Id del salón.", "Tiene clases asociadas."),
  },
  "/ritmos": {
    get: protegida("Ritmos", "Listar ritmos (RF-18 · HU-18)", ADMIN, {
      responses: { 200: ok("Ritmos de la academia.", lista("Ritmo")) },
    }),
    post: protegida("Ritmos", "Crear ritmo (RF-18 · HU-18)", ADMIN, {
      requestBody: cuerpo({ type: "object", required: ["nombre"], properties: { nombre: { type: "string" } } }, { nombre: "Bachata" }),
      responses: { 201: ok("Ritmo creado.", ref("Ritmo")), 400: error("Falta el nombre.") },
    }),
  },
  "/ritmos/{id}": {
    put: protegida("Ritmos", "Editar ritmo (RF-18 · HU-18)", ADMIN, {
      parameters: [parametroId("Id del ritmo.")],
      requestBody: cuerpo({ type: "object", required: ["nombre"], properties: { nombre: { type: "string" } } }),
      responses: { 200: ok("Ritmo actualizado.", ref("Ritmo")), 400: error("Falta el nombre."), 404: NO_EXISTE },
    }),
    delete: eliminar("Ritmos", "Eliminar ritmo (RF-18 · HU-18)", "Id del ritmo.", "Tiene clases asociadas."),
  },
  "/tarifas": {
    get: protegida("Tarifas", "Listar tarifas (RF-18 · HU-18)", ADMIN, {
      responses: { 200: ok("Tarifas, primero las activas.", lista("Tarifa")) },
    }),
    post: protegida("Tarifas", "Crear tarifa (RF-18 · HU-18)", ADMIN, {
      requestBody: cuerpo(
        {
          type: "object",
          required: ["nombre", "valor", "duracionDias"],
          properties: {
            nombre: { type: "string" },
            valor: { type: "integer", minimum: 1 },
            duracionDias: { type: "integer", minimum: 1, maximum: 366 },
          },
        },
        { nombre: "Mensualidad", valor: 120000, duracionDias: 30 },
      ),
      responses: { 201: ok("Tarifa creada.", ref("Tarifa")), 400: error("Datos inválidos.") },
    }),
  },
  "/tarifas/{id}": {
    put: protegida("Tarifas", "Editar o desactivar tarifa (RF-18 · HU-18)", ADMIN, {
      description: "Los pagos ya registrados no cambian (HU-18-CA-03).",
      parameters: [parametroId("Id de la tarifa.")],
      requestBody: cuerpo({
        type: "object",
        properties: {
          nombre: { type: "string" },
          valor: { type: "integer", minimum: 1 },
          duracionDias: { type: "integer", minimum: 1, maximum: 366 },
          activa: { type: "boolean" },
        },
      }),
      responses: { 200: ok("Tarifa actualizada.", ref("Tarifa")), 400: error("Datos inválidos."), 404: NO_EXISTE },
    }),
    delete: eliminar(
      "Tarifas",
      "Eliminar tarifa sin pagos (RN-13)",
      "Id de la tarifa.",
      "Tiene pagos registrados: se debe desactivar en su lugar.",
    ),
  },
  "/usuarios": {
    get: protegida("Usuarios", "Listar profesores o estudiantes (RF-17 · HU-17)", ADMIN, {
      parameters: [
        { name: "rol", in: "query", required: true, schema: { type: "string", enum: ["PROFESOR", "ESTUDIANTE"] } },
        { name: "incluirInactivos", in: "query", schema: { type: "string", enum: ["true", "false"] } },
      ],
      responses: { 200: ok("Usuarios de la academia.", lista("UsuarioDeAcademia")), 400: error("rol inválido.") },
    }),
    post: protegida("Usuarios", "Crear profesor o estudiante (RF-17 · HU-17)", ADMIN, {
      requestBody: cuerpo({
        type: "object",
        required: ["nombre", "email", "password", "rol", "autorizacionDatos"],
        properties: {
          nombre: { type: "string" },
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: LONGITUD_MINIMA_PASSWORD },
          rol: { type: "string", enum: ["PROFESOR", "ESTUDIANTE"] },
          autorizacionDatos: {
            type: "boolean",
            enum: [true],
            description: "Ley 1581: la academia confirma que tiene la autorización de la persona.",
          },
        },
      }),
      responses: {
        201: ok("Usuario creado.", ref("UsuarioDeAcademia")),
        400: error("Faltan datos, contraseña corta o falta la autorización."),
        409: error("Ya existe un usuario con ese correo."),
      },
    }),
  },
  "/usuarios/{id}": {
    patch: protegida("Usuarios", "Editar, activar o desactivar un usuario (RF-17 · HU-17)", ADMIN, {
      description:
        "No se borra a nadie. Un profesor con clases por dictar no se puede desactivar (RN-13); " +
        "al desactivar un estudiante se liberan los cupos de sus clases futuras.",
      parameters: [parametroId("Id del profesor o estudiante.")],
      requestBody: cuerpo({
        type: "object",
        properties: { nombre: { type: "string" }, email: { type: "string", format: "email" }, activo: { type: "boolean" } },
      }),
      responses: {
        200: ok("Usuario actualizado.", ref("UsuarioDeAcademia")),
        400: error("Datos inválidos."),
        404: NO_EXISTE,
        409: error("Correo ocupado o profesor con clases pendientes."),
      },
    }),
  },
  "/invitacion": {
    get: protegida("Invitación", "Ver el código de invitación de la academia (HU-22)", ADMIN, {
      responses: { 200: ok("Código actual.", ref("Invitacion")), 404: error("Academia no encontrada.") },
    }),
    post: protegida("Invitación", "Generar un código nuevo (HU-22)", ADMIN, {
      description: "Reemplaza al anterior, que deja de servir.",
      responses: { 201: ok("Código generado.", ref("Invitacion")) },
    }),
    delete: protegida("Invitación", "Apagar el código (HU-22)", ADMIN, {
      responses: { 200: ok("Código desactivado.", ref("Invitacion")) },
    }),
  },

  // --- Clases, reservas y asistencia ---
  "/clases": {
    get: protegida("Clases", "Catálogo de clases programadas (RF-08 · HU-08)", CUALQUIERA + " de una academia", {
      parameters: [
        { name: "ritmoId", in: "query", schema: uuid },
        { name: "fecha", in: "query", description: "Día en Colombia (UTC-5).", schema: { type: "string", format: "date" } },
        { name: "soloFuturas", in: "query", schema: { type: "string", enum: ["true", "false"] } },
      ],
      responses: { 200: ok("Clases con ritmo, salón y profesor.", lista("ClaseDelCatalogo")), 400: error("Fecha con formato inválido.") },
    }),
    post: protegida("Clases", "Programar una clase (RF-14 · HU-14)", ADMIN, {
      description:
        "Valida que el salón (RN-02) y el profesor (RN-03) no tengan otra clase en la misma franja y que el cupo quepa en el salón.",
      requestBody: cuerpo({
        type: "object",
        required: ["ritmoId", "salonId", "profesorId", "cupoMaximo", "fechaHoraInicio", "fechaHoraFin"],
        properties: {
          ritmoId: uuid,
          salonId: uuid,
          profesorId: uuid,
          cupoMaximo: { type: "integer", minimum: 1 },
          fechaHoraInicio: fecha,
          fechaHoraFin: fecha,
        },
      }),
      responses: {
        201: ok("Clase programada.", ref("Clase")),
        400: error("Datos inválidos, recurso de otra academia o cupo mayor que el salón."),
        409: error("Cruce de horario del salón o del profesor."),
      },
    }),
  },
  "/clases/{id}/cancelar": {
    patch: protegida("Clases", "Cancelar una clase (HU-14)", ADMIN, {
      description: "Si la clase no ha empezado, se avisa por correo a los estudiantes con reserva.",
      parameters: [parametroId("Id de la clase.")],
      responses: { 200: ok("Clase cancelada.", ref("Clase")), 404: NO_EXISTE },
    }),
  },
  "/clases/{id}/inscritos": {
    get: protegida("Asistencia", "Lista de inscritos de mi clase (RF-15 · HU-15)", PROFESOR, {
      parameters: [parametroId("Id de la clase.")],
      responses: {
        200: ok("Inscritos en orden alfabético.", {
          type: "array",
          items: {
            type: "object",
            properties: {
              estudianteId: uuid,
              nombre: { type: "string" },
              email: { type: "string" },
              estadoAsistencia: { ...ref("EstadoAsistencia"), nullable: true },
            },
          },
        }),
        404: NO_EXISTE,
      },
    }),
  },
  "/clases/{id}/asistencia": {
    post: protegida("Asistencia", "Registrar asistencia a mano (RF-16 · HU-16)", PROFESOR, {
      description: "Solo el día de la clase y solo para estudiantes con reserva confirmada.",
      parameters: [parametroId("Id de la clase.")],
      requestBody: cuerpo({
        type: "object",
        required: ["asistencias"],
        properties: {
          asistencias: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              required: ["estudianteId", "estado"],
              properties: { estudianteId: uuid, estado: ref("EstadoAsistencia") },
            },
          },
        },
      }),
      responses: {
        200: ok("Asistencias guardadas.", lista("Asistencia")),
        400: error("Lista vacía, estado inválido, no es el día de la clase o estudiante sin reserva."),
        404: NO_EXISTE,
      },
    }),
  },
  "/qr/reservas/{id}": {
    get: protegida("Asistencia", "Obtener el código QR de mi reserva", ESTUDIANTE, {
      description: "Solo el día de la clase. El código es un token firmado que vence al final de ese día.",
      parameters: [parametroId("Id de la reserva.")],
      responses: {
        200: ok("Código para mostrar como QR.", {
          type: "object",
          properties: { codigo: { type: "string" }, clase: { type: "string" }, fechaHoraInicio: fecha, vence: fecha },
        }),
        400: error("La reserva no está activa o no es el día de la clase."),
        404: error("Reserva no encontrada."),
      },
    }),
  },
  "/qr/clases/{id}/asistencia": {
    post: protegida("Asistencia", "Registrar asistencia escaneando el QR", PROFESOR, {
      description: "Desde 30 minutos antes de la clase y solo ese día. Deja al estudiante en ASISTIO.",
      parameters: [parametroId("Id de la clase.")],
      requestBody: cuerpo({ type: "object", required: ["codigo"], properties: { codigo: { type: "string" } } }),
      responses: {
        200: ok("Asistencia registrada.", {
          type: "object",
          properties: {
            estudiante: { type: "object", properties: { id: uuid, nombre: { type: "string" } } },
            estado: { type: "string", enum: ["ASISTIO"] },
            yaEstabaRegistrado: { type: "boolean" },
          },
        }),
        400: error("Código inválido, vencido, de otra clase o fuera de horario."),
        404: error("La clase no existe en esta academia."),
      },
    }),
  },
  "/reservas": {
    post: protegida("Reservas", "Reservar un cupo (RF-09 · HU-09)", ESTUDIANTE, {
      description:
        "El cupo baja con una operación atómica, así dos personas no pueden quedarse con el último (RN-01). " +
        "Necesita membresía al día (RN-05) y no puede cruzarse con otra reserva (RN-16).",
      requestBody: cuerpo({ type: "object", required: ["claseId"], properties: { claseId: uuid } }),
      responses: {
        201: ok("Reserva confirmada.", ref("Reserva")),
        400: error("Falta claseId, la clase ya no está disponible o no quedan cupos."),
        403: error("Membresía no vigente (codigo: MEMBRESIA_VENCIDA)."),
        404: error("La clase no existe en esta academia."),
        409: error("Ya tiene reserva en esa clase o se cruza con otra."),
      },
    }),
  },
  "/reservas/mias": {
    get: protegida("Reservas", "Mis reservas (RF-10 · HU-10)", ESTUDIANTE, {
      responses: {
        200: ok("Reservas con su clase, ritmo y salón.", {
          type: "array",
          items: {
            allOf: [
              ref("Reserva"),
              {
                type: "object",
                properties: {
                  clase: { allOf: [ref("Clase"), { type: "object", properties: { ritmo: ref("Ritmo"), salon: ref("Salon") } }] },
                },
              },
            ],
          },
        }),
      },
    }),
  },
  "/reservas/{id}/cancelar": {
    patch: protegida("Reservas", "Cancelar mi reserva (RF-10 · HU-10)", ESTUDIANTE, {
      description: "Solo antes de que empiece la clase. El cupo vuelve a quedar libre.",
      parameters: [parametroId("Id de la reserva.")],
      responses: {
        200: ok("Reserva cancelada.", ref("Mensaje")),
        400: error("La clase ya empezó o ya pasó."),
        404: error("Reserva no encontrada."),
        409: error("Ya estaba cancelada."),
      },
    }),
  },
  "/asistencias/mias": {
    get: protegida("Asistencia", "Mi historial de asistencia (RF-11 · HU-11)", ESTUDIANTE, {
      responses: {
        200: ok("Resumen y una fila por clase.", {
          type: "object",
          properties: {
            resumen: ref("ConteoAsistencia"),
            registros: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  claseId: uuid,
                  ritmo: { type: "string" },
                  salon: { type: "string" },
                  profesor: { type: "string" },
                  fechaHoraInicio: fecha,
                  estado: { ...ref("EstadoAsistencia"), nullable: true },
                },
              },
            },
          },
        }),
      },
    }),
  },

  // --- Pagos ---
  "/pagos": {
    get: protegida("Pagos", "Listar pagos de la academia (RF-19 · HU-19)", ADMIN, {
      parameters: [{ name: "estudianteId", in: "query", description: "Para ver solo los de un estudiante.", schema: uuid }],
      responses: { 200: ok("Últimos 200 pagos.", lista("Pago")) },
    }),
    post: protegida("Pagos", "Registrar un pago (RF-19 · HU-19)", ADMIN, {
      description:
        "Extiende la membresía desde donde termina la actual (RN-05). El monto por defecto es el de la tarifa y nunca puede ser cero (RN-14). " +
        "Le llega al estudiante un comprobante por correo.",
      requestBody: cuerpo({
        type: "object",
        required: ["estudianteId", "tarifaId", "medio"],
        properties: {
          estudianteId: uuid,
          tarifaId: uuid,
          medio: { type: "string", enum: ["EFECTIVO", "TRANSFERENCIA", "TARJETA", "OTRO"] },
          monto: { type: "integer", minimum: 1, description: "Opcional, por ejemplo para un descuento." },
          referencia: { type: "string" },
        },
      }),
      responses: {
        201: ok("Pago registrado.", { type: "object", properties: { pago: ref("Pago"), membresia: ref("Membresia") } }),
        400: error("Faltan datos, tarifa inactiva o monto inválido."),
        404: error("El estudiante no existe en esta academia."),
      },
    }),
  },
  "/pagos/membresias": {
    get: protegida("Pagos", "Estado de la membresía de cada estudiante (RN-05)", ADMIN, {
      responses: {
        200: ok("Estudiantes activos con su membresía.", {
          type: "array",
          items: {
            type: "object",
            properties: { id: uuid, nombre: { type: "string" }, email: { type: "string" }, membresia: ref("Membresia") },
          },
        }),
      },
    }),
  },
  "/pagos/mios": {
    get: protegida("Pagos", "Mis pagos y mi membresía (RF-12 · HU-12)", ESTUDIANTE, {
      responses: {
        200: ok("Membresía y pagos del estudiante.", {
          type: "object",
          properties: { membresia: ref("Membresia"), pagos: lista("Pago") },
        }),
      },
    }),
  },

  // --- Reportes y asistente ---
  "/reportes/ocupacion": {
    get: reporte("Ocupación por salón (RF-20 · HU-20)", "Ocupación de cada salón en el rango.", {
      salones: {
        type: "array",
        items: {
          type: "object",
          properties: {
            salonId: uuid,
            salon: { type: "string" },
            totalClases: { type: "integer" },
            capacidadOfertada: { type: "integer" },
            reservasConfirmadas: { type: "integer" },
            porcentajeOcupacion: { type: "number" },
          },
        },
      },
    }),
  },
  "/reportes/ingresos": {
    get: reporte("Ingresos por tarifa y por medio de pago (RF-20 · HU-20)", "Totales del rango.", {
      total: { type: "integer" },
      cantidadPagos: { type: "integer" },
      porTarifa: {
        type: "array",
        items: { type: "object", properties: { nombreTarifa: { type: "string" }, pagos: { type: "integer" }, total: { type: "integer" } } },
      },
      porMedio: {
        type: "array",
        items: { type: "object", properties: { medio: { type: "string" }, pagos: { type: "integer" }, total: { type: "integer" } } },
      },
    }),
  },
  "/reportes/asistencia": {
    get: reporte(
      "Asistencia por clase y por estudiante (RF-20 · HU-20)",
      "Resumen, detalle por clase y por estudiante (primero quienes más faltan).",
      {
        resumen: {
          allOf: [
            ref("ConteoAsistencia"),
            { type: "object", properties: { clases: { type: "integer" }, clasesSinRegistrar: { type: "integer" } } },
          ],
        },
        porClase: {
          type: "array",
          items: {
            allOf: [
              ref("ConteoAsistencia"),
              {
                type: "object",
                properties: {
                  claseId: uuid,
                  ritmo: { type: "string" },
                  salon: { type: "string" },
                  profesor: { type: "string" },
                  fechaHoraInicio: fecha,
                  inscritos: { type: "integer" },
                },
              },
            ],
          },
        },
        porEstudiante: {
          type: "array",
          items: {
            allOf: [
              ref("ConteoAsistencia"),
              { type: "object", properties: { estudianteId: uuid, nombre: { type: "string" }, clases: { type: "integer" } } },
            ],
          },
        },
      },
    ),
  },
  "/bitacora": {
    get: protegida("Reportes", "Últimos 200 movimientos de la academia (RF-21 · HU-21)", ADMIN, {
      responses: {
        200: ok("Movimientos, del más reciente al más antiguo.", {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: uuid,
              accion: { type: "string" },
              detalle: { type: "string" },
              fecha,
              usuario: { type: "object", properties: { nombre: { type: "string" }, rol: ref("Rol") } },
            },
          },
        }),
      },
    }),
  },
  "/asistente/estado": {
    get: protegida("Asistente de IA", "Saber si el asistente está activo (RF-23 · HU-24)", ADMIN, {
      responses: { 200: ok("Disponibilidad.", { type: "object", properties: { disponible: { type: "boolean" } } }) },
    }),
  },
  "/asistente": {
    post: protegida("Asistente de IA", "Hacerle una pregunta al asistente (RF-23 · HU-24)", ADMIN, {
      description: "Responde con datos de la propia academia (ADR-004). Límite: 20 preguntas por hora por usuario.",
      requestBody: cuerpo(
        { type: "object", required: ["pregunta"], properties: { pregunta: { type: "string", minLength: 3, maxLength: 500 } } },
        { pregunta: "¿Cuánto ingresó la academia este mes?" },
      ),
      responses: {
        200: ok("Respuesta del asistente.", {
          type: "object",
          properties: {
            respuesta: { type: "string" },
            consultas: { type: "array", items: { type: "string" }, description: "Qué datos consultó para responder." },
            vueltas: { type: "integer" },
          },
        }),
        400: error("Pregunta muy corta o muy larga."),
        422: error("El asistente no pudo responder esa pregunta."),
        429: error("Demasiadas preguntas en poco tiempo."),
        503: error("El asistente no está activo o el proveedor no responde."),
      },
    }),
  },

  // --- SuperAdmin y tareas programadas ---
  "/superadmin/tenants": {
    get: protegida("SuperAdmin", "Listar academias (RF-02 · HU-02)", "SuperAdmin del SaaS (SUPERADMIN)", {
      responses: { 200: ok("Academias, de la más nueva a la más antigua.", lista("Academia")) },
    }),
  },
  "/superadmin/tenants/{id}/estado": {
    patch: protegida("SuperAdmin", "Activar o suspender una academia (RF-03 · HU-03)", "SuperAdmin del SaaS (SUPERADMIN)", {
      description: "Solo cambia el estado; ningún dato se borra (RN-06).",
      parameters: [parametroId("Id de la academia.")],
      requestBody: cuerpo({
        type: "object",
        required: ["estado"],
        properties: { estado: { type: "string", enum: ["ACTIVA", "SUSPENDIDA"] } },
      }),
      responses: {
        200: ok("Estado cambiado.", ref("Academia")),
        400: error("Estado inválido."),
        404: error("Academia no encontrada."),
        409: error("La academia ya está en ese estado."),
      },
    }),
  },
  "/tareas/diarias": {
    post: {
      tags: ["Sistema"],
      summary: "Enviar recordatorios de clase y avisos de membresía (OE-6)",
      description:
        "No la usa ninguna persona: la llama cron-job.org cada mañana con la clave TAREAS_TOKEN. " +
        "Si esa clave no está configurada, la ruta no existe (404).",
      security: [{ tareasToken: [] }],
      responses: {
        200: ok("Cuántos correos se enviaron.", {
          type: "object",
          properties: { recordatorios: { type: "integer" }, avisosMembresia: { type: "integer" } },
        }),
        401: error("Clave incorrecta."),
        404: error("Tareas programadas no configuradas."),
      },
    },
  },
};

const especificacion = {
  openapi: "3.0.3",
  info: {
    title: "RitmoApp API",
    version: "1.0.0",
    description:
      "API REST de RitmoApp, el SaaS multi-academia para academias de baile (proyecto de grado ADSO, SENA, ficha 3229209).\n\n" +
      "**Cómo probarla:**\n" +
      "1. Abre `POST /auth/login`, pulsa **Try it out** y entra con un usuario de la demo.\n" +
      "2. Copia el `token` de la respuesta.\n" +
      "3. Pulsa **Authorize** (arriba a la derecha), pega el token y acepta.\n\n" +
      "Cada academia solo ve sus propios datos: el token lleva su `tenantId` y la API filtra todo con él (RN-04).",
    contact: { name: "Equipo RitmoApp" },
  },
  servers: [{ url: "/api", description: "Esta misma instalación" }],
  tags: [
    { name: "Sistema" },
    { name: "Autenticación", description: "Rutas públicas, con límite de intentos por IP." },
    ...[
      "Perfil",
      "Salones",
      "Ritmos",
      "Tarifas",
      "Usuarios",
      "Invitación",
      "Clases",
      "Reservas",
      "Asistencia",
      "Pagos",
      "Reportes",
      "Asistente de IA",
      "SuperAdmin",
    ].map((name) => ({ name })),
  ],
  security: [{ bearerAuth: [] }],
  paths,
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT", description: "El token que devuelve POST /auth/login." },
      tareasToken: { type: "http", scheme: "bearer", description: "La clave TAREAS_TOKEN (solo para las tareas programadas)." },
    },
    responses: {
      SinSesion: error("Falta el token o venció."),
      SinPermiso: error("El rol del usuario no puede usar esta ruta, o no pertenece a una academia."),
      DemasiadosIntentos: error("Demasiados intentos desde la misma IP. Hay que esperar."),
    },
    schemas,
  },
};

module.exports = especificacion;
