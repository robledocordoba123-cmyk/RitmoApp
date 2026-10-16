const request = require("supertest");
const app = require("../src/app");
const { limpiarBD, prisma } = require("./helpers/db");
const { crearAcademia, crearUsuario, crearSalon, crearRitmo } = require("./helpers/fixtures");
const { login } = require("./helpers/auth");

// OE-4 del acta · RF-20: reporte de asistencia del administrador.

const DIA = 24 * 60 * 60 * 1000;
let academia;
let profesor;
let tokenAdmin;
let salon;
let ritmo;

beforeEach(async () => {
  await limpiarBD();
  academia = await crearAcademia();
  await crearUsuario(academia.id, "ADMIN_ACADEMIA", { email: "admin@rep.test" });
  profesor = await crearUsuario(academia.id, "PROFESOR", { email: "profe@rep.test", nombre: "Profe Uno" });
  tokenAdmin = await login("admin@rep.test");
  salon = await crearSalon(academia.id, { nombre: "Salón 1" });
  ritmo = await crearRitmo(academia.id, { nombre: "Salsa" });
});

afterAll(async () => {
  await prisma.$disconnect();
});

// Fecha YYYY-MM-DD de Colombia, a "dias" de hoy.
function dia(dias) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date(Date.now() + dias * DIA));
}

async function clase(diasDesdeHoy, { tenantId = academia.id, estado = "PROGRAMADA", s = salon, r = ritmo, p = profesor } = {}) {
  const inicio = new Date(Date.now() + diasDesdeHoy * DIA);
  return prisma.clase.create({
    data: { tenantId, ritmoId: r.id, salonId: s.id, profesorId: p.id, estado, cupoMaximo: 10, cuposDisponibles: 10, fechaHoraInicio: inicio, fechaHoraFin: new Date(inicio.getTime() + 3600000) },
  });
}

async function inscribir(c, estudiante, asistencia, estadoReserva = "CONFIRMADA") {
  await prisma.reserva.create({ data: { tenantId: c.tenantId, claseId: c.id, estudianteId: estudiante.id, estado: estadoReserva } });
  if (asistencia) {
    await prisma.asistencia.create({ data: { tenantId: c.tenantId, claseId: c.id, estudianteId: estudiante.id, estado: asistencia, registradoPorId: c.profesorId } });
  }
}

function reporte(desde = dia(-10), hasta = dia(0), token = tokenAdmin) {
  return request(app).get(`/api/reportes/asistencia?desde=${desde}&hasta=${hasta}`).set("Authorization", `Bearer ${token}`);
}

describe("OE-4 · RF-20: reporte de asistencia", () => {
  test("CP-173 · resume la asistencia por clase y por estudiante, con primero a quien más falta", async () => {
    const ana = await crearUsuario(academia.id, "ESTUDIANTE", { email: "ana@rep.test", nombre: "Ana" });
    const beto = await crearUsuario(academia.id, "ESTUDIANTE", { email: "beto@rep.test", nombre: "Beto" });
    const c1 = await clase(-3);
    await inscribir(c1, ana, "ASISTIO");
    await inscribir(c1, beto, "INASISTENCIA");
    const c2 = await clase(-2);
    await inscribir(c2, ana, "ASISTIO");
    await inscribir(c2, beto, "EXCUSA");
    const c3 = await clase(-1);
    await inscribir(c3, ana, null);

    const res = await reporte();

    expect(res.status).toBe(200);
    expect(res.body.resumen).toEqual({ clases: 3, clasesSinRegistrar: 1, asistio: 2, inasistencia: 1, excusa: 1, sinRegistrar: 1, porcentajeAsistencia: 50 });
    expect(res.body.porClase.map((c) => c.claseId)).toEqual([c3.id, c2.id, c1.id]);
    expect(res.body.porClase[2]).toMatchObject({ ritmo: "Salsa", salon: "Salón 1", profesor: "Profe Uno", inscritos: 2, asistio: 1, inasistencia: 1, porcentajeAsistencia: 50 });
    expect(res.body.porClase[0]).toMatchObject({ inscritos: 1, sinRegistrar: 1, porcentajeAsistencia: null });
    expect(res.body.porEstudiante).toEqual([
      { estudianteId: beto.id, nombre: "Beto", clases: 2, asistio: 0, inasistencia: 1, excusa: 1, sinRegistrar: 0, porcentajeAsistencia: 0 },
      { estudianteId: ana.id, nombre: "Ana", clases: 3, asistio: 2, inasistencia: 0, excusa: 0, sinRegistrar: 1, porcentajeAsistencia: 100 },
    ]);
  });

  test("CP-174 · no cuenta clases futuras, canceladas, fuera del rango ni reservas canceladas", async () => {
    const ana = await crearUsuario(academia.id, "ESTUDIANTE", { email: "ana@rep.test" });
    const beto = await crearUsuario(academia.id, "ESTUDIANTE", { email: "beto@rep.test" });
    await inscribir(await clase(1), ana, null); // futura
    await inscribir(await clase(-2, { estado: "CANCELADA" }), ana, null);
    await inscribir(await clase(-20), ana, "ASISTIO"); // fuera del rango
    const valida = await clase(-1);
    await inscribir(valida, ana, "ASISTIO");
    await inscribir(valida, beto, null, "CANCELADA");

    const res = await reporte();

    expect(res.body.resumen.clases).toBe(1);
    expect(res.body.porClase[0]).toMatchObject({ claseId: valida.id, inscritos: 1, asistio: 1 });
    expect(res.body.porEstudiante).toHaveLength(1);
  });

  test("CP-175 · solo muestra la academia propia (RN-04) y solo lo ve el administrador", async () => {
    const otra = await crearAcademia();
    const profeOtra = await crearUsuario(otra.id, "PROFESOR");
    const estOtra = await crearUsuario(otra.id, "ESTUDIANTE");
    const cOtra = await clase(-1, { tenantId: otra.id, s: await crearSalon(otra.id), r: await crearRitmo(otra.id), p: profeOtra });
    await inscribir(cOtra, estOtra, "ASISTIO");
    await crearUsuario(academia.id, "ESTUDIANTE", { email: "cami@rep.test" });

    const res = await reporte();

    expect(res.body.resumen.clases).toBe(0);
    expect(res.body.resumen.porcentajeAsistencia).toBeNull();
    expect((await reporte(dia(-10), dia(0), await login("profe@rep.test"))).status).toBe(403);
    expect((await reporte(dia(-10), dia(0), await login("cami@rep.test"))).status).toBe(403);
  });

  test("CP-176 · fechas faltantes o con otro formato responden 400", async () => {
    expect((await request(app).get("/api/reportes/asistencia").set("Authorization", `Bearer ${tokenAdmin}`)).status).toBe(400);
    expect((await reporte("16/10/2026", dia(0))).status).toBe(400);
    expect((await reporte(dia(0), dia(-5))).status).toBe(400);
  });
});
