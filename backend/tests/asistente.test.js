const request = require("supertest");
const Anthropic = require("@anthropic-ai/sdk");
const app = require("../src/app");
const { limpiarBD, prisma } = require("./helpers/db");
const { crearAcademia, crearUsuario, crearSalon, crearRitmo, darMembresia } = require("./helpers/fixtures");
const { login } = require("./helpers/auth");
const { usarClienteDePrueba } = require("../src/controllers/asistente.controller");
const { MAX_VUELTAS } = require("../src/utils/asistente/asistente");

// RF-23 · HU-24: asistente de IA del administrador. El modelo se simula: las
// pruebas no llaman a la API real, no gastan dinero y deciden qué "responde".

const DIA = 24 * 60 * 60 * 1000;
let academia;
let otra;
let tokenAdmin;
let profesor;

// Cliente falso con la misma forma del SDK: devuelve en orden las respuestas
// que se le den y guarda cada petición para revisarla después.
function clienteSimulado(respuestas) {
  const peticiones = [];
  const cola = [...respuestas];
  return {
    peticiones,
    beta: {
      messages: {
        create: async (params) => {
          peticiones.push(JSON.parse(JSON.stringify(params)));
          const siguiente = cola.length > 1 ? cola.shift() : cola[0];
          if (siguiente instanceof Error) throw siguiente;
          return siguiente;
        },
      },
    },
  };
}
const usarHerramienta = (name, input, id = "t1") => ({ stop_reason: "tool_use", content: [{ type: "tool_use", id, name, input }] });
const responderTexto = (text) => ({ stop_reason: "end_turn", content: [{ type: "text", text }] });
const preguntar = (pregunta, token = tokenAdmin) =>
  request(app).post("/api/asistente").set("Authorization", `Bearer ${token}`).send({ pregunta });

function dia(dias) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date(Date.now() + dias * DIA));
}

async function clase(tenantId, salon, ritmo, prof, diasDesdeHoy, cupo = 10) {
  const inicio = new Date(Date.now() + diasDesdeHoy * DIA);
  return prisma.clase.create({
    data: { tenantId, ritmoId: ritmo.id, salonId: salon.id, profesorId: prof.id, cupoMaximo: cupo, cuposDisponibles: cupo, fechaHoraInicio: inicio, fechaHoraFin: new Date(inicio.getTime() + 3600000) },
  });
}

beforeEach(async () => {
  await limpiarBD();
  academia = await crearAcademia({ nombre: "Academia Uno" });
  otra = await crearAcademia({ nombre: "Academia Dos" });
  await crearUsuario(academia.id, "ADMIN_ACADEMIA", { email: "admin@asis.test" });
  profesor = await crearUsuario(academia.id, "PROFESOR", { email: "profe@asis.test", nombre: "Profe Uno" });
  tokenAdmin = await login("admin@asis.test");
});

afterEach(() => {
  usarClienteDePrueba(null);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("RF-23 · HU-24: asistente de IA del administrador", () => {
  test("CP-183 · sin ANTHROPIC_API_KEY el asistente queda apagado y la app sigue funcionando", async () => {
    const clave = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      const estado = await request(app).get("/api/asistente/estado").set("Authorization", `Bearer ${tokenAdmin}`);
      expect(estado.status).toBe(200);
      expect(estado.body.disponible).toBe(false);

      const res = await preguntar("¿Qué salón está más lleno?");
      expect(res.status).toBe(503);
    } finally {
      if (clave !== undefined) process.env.ANTHROPIC_API_KEY = clave;
    }
  });

  test("CP-184 · solo el administrador puede usarlo: profesor y estudiante reciben 403", async () => {
    usarClienteDePrueba(clienteSimulado([responderTexto("hola")]));
    await crearUsuario(academia.id, "ESTUDIANTE", { email: "estu@asis.test" });
    for (const correo of ["profe@asis.test", "estu@asis.test"]) {
      const res = await preguntar("¿Qué salón está más lleno?", await login(correo));
      expect(res.status).toBe(403);
    }
  });

  test("CP-185 · una pregunta vacía o de más de 500 caracteres responde 400 sin llamar al modelo", async () => {
    const cliente = clienteSimulado([responderTexto("no debería llegar aquí")]);
    usarClienteDePrueba(cliente);
    expect((await preguntar("  ")).status).toBe(400);
    expect((await preguntar("a".repeat(501))).status).toBe(400);
    expect(cliente.peticiones).toHaveLength(0);
  });

  test("CP-186 · responde con datos de su academia: usa la herramienta, ve solo sus salones y nunca los de otra", async () => {
    const ritmo = await crearRitmo(academia.id, { nombre: "Salsa" });
    const salonPropio = await crearSalon(academia.id, { nombre: "Salón Espejos" });
    await clase(academia.id, salonPropio, ritmo, profesor, -2);
    const profeOtra = await crearUsuario(otra.id, "PROFESOR", { email: "profe2@asis.test" });
    await clase(otra.id, await crearSalon(otra.id, { nombre: "Salón Ajeno" }), await crearRitmo(otra.id, { nombre: "Tango" }), profeOtra, -2);

    const cliente = clienteSimulado([
      usarHerramienta("ocupacion_por_salon", { desde: dia(-10), hasta: dia(0) }),
      responderTexto("El salón más lleno este mes es Salón Espejos."),
    ]);
    usarClienteDePrueba(cliente);

    const res = await preguntar("¿Qué salón está más lleno este mes?");
    expect(res.status).toBe(200);
    expect(res.body.respuesta).toBe("El salón más lleno este mes es Salón Espejos.");
    expect(res.body.consultas).toEqual(["Ocupación por salón"]);

    // Primera petición: herramientas de solo lectura con esquema estricto y poco esfuerzo.
    const [primera, segunda] = cliente.peticiones;
    expect(primera.model).toBe("claude-opus-5-5");
    expect(primera.output_config).toEqual({ effort: "low" });
    expect(primera.tools.map((t) => t.name).sort()).toEqual(["asistencia", "clases_programadas", "ingresos", "membresias", "ocupacion_por_salon"]);
    expect(primera.tools.every((t) => t.strict === true && t.input_schema.additionalProperties === false)).toBe(true);
    expect(primera.messages[0].content).toContain("¿Qué salón está más lleno este mes?");

    // Segunda petición: el resultado de la herramienta trae solo la academia propia.
    const resultado = segunda.messages[2].content[0];
    expect(resultado.type).toBe("tool_result");
    expect(resultado.tool_use_id).toBe("t1");
    expect(resultado.content).toContain("Salón Espejos");
    expect(resultado.content).not.toContain("Salón Ajeno");
  });

  test("CP-187 · membresías: devuelve nombres y vigencia, nunca correos ni estudiantes de otra academia", async () => {
    const porVencer = await crearUsuario(academia.id, "ESTUDIANTE", { email: "vence@asis.test", nombre: "Vale Pronto", membresia: false });
    await darMembresia(academia.id, porVencer.id, { vigenteHasta: new Date(Date.now() + 3 * DIA) });
    await crearUsuario(academia.id, "ESTUDIANTE", { email: "aldia@asis.test", nombre: "Ana Al Día" });
    await crearUsuario(otra.id, "ESTUDIANTE", { email: "ajeno@asis.test", nombre: "Estudiante Ajeno", membresia: false });

    const cliente = clienteSimulado([
      usarHerramienta("membresias", { filtro: "POR_VENCER", dias: 7 }),
      responderTexto("A Vale Pronto se le vence la membresía en 3 días."),
    ]);
    usarClienteDePrueba(cliente);

    const res = await preguntar("¿A quién se le vence la membresía esta semana?");
    expect(res.status).toBe(200);
    const datos = JSON.parse(cliente.peticiones[1].messages[2].content[0].content);
    expect(datos.estudiantes.map((e) => e.nombre)).toEqual(["Vale Pronto"]);
    expect(JSON.stringify(datos)).not.toContain("@");
    expect(JSON.stringify(datos)).not.toContain("Estudiante Ajeno");
  });

  test(`CP-188 · si el modelo no termina en ${MAX_VUELTAS} vueltas, se detiene y lo explica`, async () => {
    const cliente = clienteSimulado([usarHerramienta("ingresos", { desde: dia(-30), hasta: dia(0) })]);
    usarClienteDePrueba(cliente);

    const res = await preguntar("¿Cuánto ganamos?");
    expect(res.status).toBe(422);
    expect(res.body.codigo).toBe("limite");
    expect(cliente.peticiones).toHaveLength(MAX_VUELTAS);
  });

  test("CP-189 · una herramienta inexistente o con fechas malas vuelve como error y el modelo puede corregir", async () => {
    const cliente = clienteSimulado([
      usarHerramienta("borrar_clases", {}, "t1"),
      usarHerramienta("ingresos", { desde: "ayer", hasta: "hoy" }, "t2"),
      responderTexto("No pude consultar eso."),
    ]);
    usarClienteDePrueba(cliente);

    const res = await preguntar("Borra todas las clases");
    expect(res.status).toBe(200);
    const inexistente = cliente.peticiones[1].messages[2].content[0];
    expect(inexistente.is_error).toBe(true);
    const fechasMalas = cliente.peticiones[2].messages[4].content[0];
    expect(fechasMalas.is_error).toBe(true);
    expect(fechasMalas.content).toContain("YYYY-MM-DD");
    // Nada se borró: el asistente no tiene herramientas que cambien datos.
    expect(await prisma.clase.count()).toBe(0);
  });

  test("CP-190 · un rechazo del modelo o una caída de la API se explican sin mostrar el error interno", async () => {
    usarClienteDePrueba(clienteSimulado([{ stop_reason: "refusal", content: [] }]));
    const rechazo = await preguntar("¿Qué salón está más lleno?");
    expect(rechazo.status).toBe(422);
    expect(rechazo.body.codigo).toBe("rechazo");

    usarClienteDePrueba(clienteSimulado([new Anthropic.APIConnectionError({ message: "detalle interno de la red" })]));
    const caida = await preguntar("¿Qué salón está más lleno?");
    expect(caida.status).toBe(503);
    expect(JSON.stringify(caida.body)).not.toContain("detalle interno");

    usarClienteDePrueba(clienteSimulado([new Anthropic.RateLimitError(429, { type: "error" }, "demasiadas", new Headers())]));
    expect((await preguntar("¿Qué salón está más lleno?")).status).toBe(429);
  });

  test("CP-192 · las cinco herramientas devuelven los datos reales de la academia, sin ids ni correos", async () => {
    const { ejecutar } = require("../src/utils/asistente/herramientas");
    const { forTenant } = require("../src/config/tenantPrismaClient");
    const ritmo = await crearRitmo(academia.id, { nombre: "Bachata" });
    const salon = await crearSalon(academia.id, { nombre: "Salón Luz" });
    const ana = await crearUsuario(academia.id, "ESTUDIANTE", { email: "ana@asis.test", nombre: "Ana" });
    const pasada = await clase(academia.id, salon, ritmo, profesor, -1);
    await prisma.reserva.create({ data: { tenantId: academia.id, claseId: pasada.id, estudianteId: ana.id, estado: "CONFIRMADA" } });
    await prisma.asistencia.create({ data: { tenantId: academia.id, claseId: pasada.id, estudianteId: ana.id, estado: "INASISTENCIA", registradoPorId: profesor.id } });
    await clase(academia.id, salon, ritmo, profesor, 2);
    const contexto = { db: forTenant(academia.id), tenantId: academia.id };
    const periodo = { desde: dia(-5), hasta: dia(5) };

    const resultados = {};
    for (const [nombre, entrada] of [
      ["ocupacion_por_salon", periodo],
      ["ingresos", periodo],
      ["asistencia", periodo],
      ["membresias", { filtro: "TODAS", dias: 0 }],
      ["clases_programadas", periodo],
    ]) {
      const r = await ejecutar(nombre, entrada, contexto);
      expect(r.esError).toBe(false);
      expect(r.contenido).not.toMatch(/@|"(id|salonId|claseId|estudianteId)"/);
      resultados[nombre] = JSON.parse(r.contenido);
    }
    expect(resultados.ocupacion_por_salon.salones[0].salon).toBe("Salón Luz");
    expect(resultados.ingresos.cantidadPagos).toBeGreaterThan(0);
    expect(resultados.asistencia.estudiantes[0]).toMatchObject({ nombre: "Ana", inasistencia: 1 });
    expect(resultados.membresias.estudiantes.map((e) => e.nombre)).toContain("Ana");
    expect(resultados.clases_programadas.clases).toHaveLength(2);
    expect((await ejecutar("membresias", { filtro: "NINGUNO", dias: 0 }, contexto)).esError).toBe(true);
  });

  test("CP-191 · cada consulta queda en la bitácora, sin guardar la pregunta", async () => {
    usarClienteDePrueba(clienteSimulado([responderTexto("Tienes 0 clases hoy.")]));
    const res = await preguntar("¿Cuántas clases tengo hoy? Mi correo es secreto@asis.test");
    expect(res.status).toBe(200);

    const registros = await prisma.bitacora.findMany({ where: { tenantId: academia.id } });
    expect(registros).toHaveLength(1);
    expect(registros[0].accion).toBe("Consultó al asistente de IA");
    expect(JSON.stringify(registros[0])).not.toContain("secreto@asis.test");
  });
});
