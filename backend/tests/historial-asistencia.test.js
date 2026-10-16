const request = require("supertest");
const app = require("../src/app");
const { limpiarBD, prisma } = require("./helpers/db");
const { crearAcademia, crearUsuario, crearSalon, crearRitmo } = require("./helpers/fixtures");
const { login } = require("./helpers/auth");

// RF-11 · HU-11: el estudiante consulta su historial de asistencia.

let academia;
let profesor;
let ana;
let tokenAna;

beforeEach(async () => {
  await limpiarBD();
  academia = await crearAcademia();
  profesor = await crearUsuario(academia.id, "PROFESOR", { email: "profe@historial.test" });
  ana = await crearUsuario(academia.id, "ESTUDIANTE", { email: "ana@historial.test", nombre: "Ana" });
  tokenAna = await login("ana@historial.test");
});

afterAll(async () => {
  await prisma.$disconnect();
});

// Clase directo en BD, a `dias` de hoy (negativo = pasada).
async function clase(dias, ritmoNombre = "Salsa") {
  const salon = await crearSalon(academia.id);
  const ritmo = await crearRitmo(academia.id, { nombre: ritmoNombre });
  const inicio = new Date(Date.now() + dias * 24 * 60 * 60 * 1000);
  return prisma.clase.create({
    data: {
      tenantId: academia.id,
      ritmoId: ritmo.id,
      salonId: salon.id,
      profesorId: profesor.id,
      cupoMaximo: 10,
      cuposDisponibles: 9,
      fechaHoraInicio: inicio,
      fechaHoraFin: new Date(inicio.getTime() + 60 * 60 * 1000),
    },
  });
}

async function reservar(c, estudiante = ana, estado = "CONFIRMADA") {
  return prisma.reserva.create({ data: { tenantId: academia.id, claseId: c.id, estudianteId: estudiante.id, estado } });
}

async function marcar(c, estado, estudiante = ana) {
  return prisma.asistencia.create({
    data: { tenantId: academia.id, claseId: c.id, estudianteId: estudiante.id, estado, registradoPorId: profesor.id },
  });
}

function verHistorial(token = tokenAna) {
  return request(app).get("/api/asistencias/mias").set("Authorization", `Bearer ${token}`);
}

describe("RF-11 · HU-11: historial de asistencia del estudiante", () => {
  test("CP-139 · muestra las clases pasadas con su estado, de la más reciente a la más antigua, y el porcentaje", async () => {
    const hace10 = await clase(-10, "Salsa");
    const hace5 = await clase(-5, "Bachata");
    const hace2 = await clase(-2, "Tango");
    for (const c of [hace10, hace5, hace2]) await reservar(c);
    await marcar(hace10, "ASISTIO");
    await marcar(hace5, "INASISTENCIA");
    // hace2: el profesor todavía no registró la asistencia.

    const res = await verHistorial();

    expect(res.status).toBe(200);
    expect(res.body.registros.map((r) => [r.ritmo, r.estado])).toEqual([
      ["Tango", null],
      ["Bachata", "INASISTENCIA"],
      ["Salsa", "ASISTIO"],
    ]);
    expect(res.body.resumen).toEqual({ asistio: 1, inasistencia: 1, excusa: 0, sinRegistrar: 1, porcentajeAsistencia: 50 });
  });

  test("CP-140 · no incluye clases futuras, reservas canceladas ni clases canceladas", async () => {
    const futura = await clase(3);
    const cancelada = await clase(-3);
    const claseCancelada = await clase(-4);
    await reservar(futura);
    await reservar(cancelada, ana, "CANCELADA");
    await reservar(claseCancelada);
    await prisma.clase.update({ where: { id: claseCancelada.id }, data: { estado: "CANCELADA" } });

    const res = await verHistorial();

    expect(res.body.registros).toEqual([]);
  });

  test("CP-141 · sin historial responde una lista vacía y el porcentaje en null", async () => {
    const res = await verHistorial();

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ resumen: { asistio: 0, inasistencia: 0, excusa: 0, sinRegistrar: 0, porcentajeAsistencia: null }, registros: [] });
  });

  test("CP-142 · RN-04: no muestra la asistencia de otro estudiante ni de otra academia", async () => {
    const c = await clase(-2);
    const beto = await crearUsuario(academia.id, "ESTUDIANTE", { email: "beto@historial.test" });
    await reservar(c, beto);
    await marcar(c, "ASISTIO", beto);

    const otra = await crearAcademia({ nombre: "Otra" });
    await crearUsuario(otra.id, "ESTUDIANTE", { email: "ajeno@historial.test" });

    expect((await verHistorial()).body.registros).toEqual([]);
    expect((await verHistorial(await login("ajeno@historial.test"))).body.registros).toEqual([]);
  });

  test("CP-143 · solo el estudiante consulta su historial: profesor y admin reciben 403", async () => {
    await crearUsuario(academia.id, "ADMIN_ACADEMIA", { email: "admin@historial.test" });

    expect((await verHistorial(await login("profe@historial.test"))).status).toBe(403);
    expect((await verHistorial(await login("admin@historial.test"))).status).toBe(403);
  });
});
