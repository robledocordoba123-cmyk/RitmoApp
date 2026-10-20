const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../src/app");
const { limpiarBD, prisma } = require("./helpers/db");
const { crearAcademia, crearUsuario, crearSalon, crearRitmo } = require("./helpers/fixtures");
const { login } = require("./helpers/auth");

// Asistencia con código QR. La hora se fija (solo Date, no los temporizadores)
// para que "el día de la clase" no dependa de cuándo se corran las pruebas:
// 16/10/2026 a las 3:00 p. m. de Colombia.
const AHORA = new Date("2026-10-16T20:00:00Z");
const HORA = 60 * 60 * 1000;

let academia;
let profesor;
let tokenProfe;

beforeEach(async () => {
  jest.useFakeTimers({ now: AHORA, doNotFake: ["nextTick", "setImmediate", "setTimeout", "setInterval", "clearTimeout", "clearInterval", "queueMicrotask", "hrtime", "performance"] });
  await limpiarBD();
  academia = await crearAcademia();
  profesor = await crearUsuario(academia.id, "PROFESOR", { email: "profe@qr.test" });
  tokenProfe = await login("profe@qr.test");
});

afterEach(() => {
  jest.useRealTimers();
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function clase({ inicio = new Date(AHORA.getTime() + 20 * 60 * 1000), tenantId = academia.id, profesorId = profesor.id, estado = "PROGRAMADA" } = {}) {
  const salon = await crearSalon(tenantId);
  const ritmo = await crearRitmo(tenantId, { nombre: "Salsa" });
  return prisma.clase.create({
    data: { tenantId, ritmoId: ritmo.id, salonId: salon.id, profesorId, estado, cupoMaximo: 10, cuposDisponibles: 9, fechaHoraInicio: inicio, fechaHoraFin: new Date(inicio.getTime() + HORA) },
  });
}

let contador = 0;
async function estudianteCon(c) {
  contador += 1;
  const email = `est${contador}@qr.test`;
  const e = await crearUsuario(c.tenantId, "ESTUDIANTE", { email, nombre: `Estudiante ${contador}` });
  const reserva = await prisma.reserva.create({ data: { tenantId: c.tenantId, claseId: c.id, estudianteId: e.id } });
  return { e, reserva, token: await login(email) };
}

function pedirQr(token, reservaId) {
  return request(app).get(`/api/qr/reservas/${reservaId}`).set("Authorization", `Bearer ${token}`);
}

function escanear(claseId, codigo, token = tokenProfe) {
  return request(app).post(`/api/qr/clases/${claseId}/asistencia`).set("Authorization", `Bearer ${token}`).send({ codigo });
}

describe("Asistencia con código QR", () => {
  test("CP-165 · el estudiante obtiene su QR y al escanearlo queda en Asistió", async () => {
    const c = await clase();
    const { e, reserva, token } = await estudianteCon(c);

    const qr = await pedirQr(token, reserva.id);
    expect(qr.status).toBe(200);
    expect(qr.body.clase).toBe("Salsa");
    expect(qr.body.codigo.length).toBeLessThan(250); // corto, para que la cámara lo lea fácil

    const res = await escanear(c.id, qr.body.codigo);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ estudiante: { id: e.id, nombre: e.nombre }, estado: "ASISTIO", yaEstabaRegistrado: false });
    const asistencia = await prisma.asistencia.findFirst({ where: { claseId: c.id, estudianteId: e.id } });
    expect(asistencia).toMatchObject({ estado: "ASISTIO", registradoPorId: profesor.id });

    const otraVez = await escanear(c.id, qr.body.codigo);
    expect(otraVez.body.yaEstabaRegistrado).toBe(true);
  });

  test("CP-166 · el QR solo se entrega el día de la clase, de una reserva activa y propia", async () => {
    const manana = await clase({ inicio: new Date(AHORA.getTime() + 24 * HORA) });
    const { reserva: rManana, token: tManana } = await estudianteCon(manana);
    const c = await clase();
    const { reserva, token } = await estudianteCon(c);
    const { token: otro } = await estudianteCon(c);

    expect((await pedirQr(tManana, rManana.id)).status).toBe(400);
    expect((await pedirQr(otro, reserva.id)).status).toBe(404);
    await prisma.reserva.update({ where: { id: reserva.id }, data: { estado: "CANCELADA" } });
    expect((await pedirQr(token, reserva.id)).status).toBe(400);
  });

  test("CP-167 · un código falso, alterado o de otra clase se rechaza", async () => {
    const c1 = await clase();
    const c2 = await clase({ inicio: new Date(AHORA.getTime() + 2 * HORA) });
    const { reserva, token } = await estudianteCon(c1);
    const { codigo } = (await pedirQr(token, reserva.id)).body;

    // Firmado con la clave de las sesiones, no con la del QR.
    const falso = jwt.sign({ sub: reserva.id }, process.env.JWT_SECRET, { audience: "ritmoapp-asistencia-qr" });
    expect((await escanear(c1.id, falso)).status).toBe(400);
    expect((await escanear(c1.id, codigo.slice(0, -2) + "xx")).status).toBe(400);
    expect((await escanear(c1.id, "")).status).toBe(400);
    const deOtra = await escanear(c2.id, codigo);
    expect(deOtra.status).toBe(400);
    expect(deOtra.body.error).toMatch(/otra clase/);
    expect(await prisma.asistencia.count()).toBe(0);
  });

  test("CP-168 · el QR no sirve como token de sesión", async () => {
    const c = await clase();
    const { reserva, token } = await estudianteCon(c);
    const { codigo } = (await pedirQr(token, reserva.id)).body;

    const res = await request(app).get("/api/reservas/mias").set("Authorization", `Bearer ${codigo}`);
    expect(res.status).toBe(401);
  });

  test("CP-169 · solo escanea el profesor asignado, y no antes de 30 minutos del inicio", async () => {
    const c = await clase();
    const { reserva, token } = await estudianteCon(c);
    const { codigo } = (await pedirQr(token, reserva.id)).body;
    await crearUsuario(academia.id, "PROFESOR", { email: "otro@qr.test" });

    expect((await escanear(c.id, codigo, await login("otro@qr.test"))).status).toBe(403);
    expect((await escanear(c.id, codigo, token)).status).toBe(403); // un estudiante tampoco

    const tarde = await clase({ inicio: new Date(AHORA.getTime() + 3 * HORA) });
    const { reserva: r2, token: t2 } = await estudianteCon(tarde);
    const temprano = await escanear(tarde.id, (await pedirQr(t2, r2.id)).body.codigo);
    expect(temprano.status).toBe(400);
    expect(temprano.body.error).toMatch(/30 minutos/);
  });

  test("CP-170 · si la reserva se canceló después de generar el QR, el código ya no sirve", async () => {
    const c = await clase();
    const { reserva, token } = await estudianteCon(c);
    const { codigo } = (await pedirQr(token, reserva.id)).body;
    await prisma.reserva.update({ where: { id: reserva.id }, data: { estado: "CANCELADA" } });

    const res = await escanear(c.id, codigo);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/ya no está activa/);
  });

  // RF-21 · HU-21: el escaneo también queda en la bitácora de la academia.
  test("CP-179 · cada escaneo exitoso queda en la bitácora con el estudiante y la clase", async () => {
    const c = await clase();
    const { e, reserva, token } = await estudianteCon(c);
    const { codigo } = (await pedirQr(token, reserva.id)).body;

    await escanear(c.id, codigo);
    await escanear(c.id, codigo);

    const filas = await prisma.bitacora.findMany({ where: { tenantId: academia.id } });
    filas.sort((a, b) => a.detalle.localeCompare(b.detalle)); // los dos escaneos pueden tener la misma fecha
    expect(filas.map((f) => f.detalle)).toEqual([e.nombre, `${e.nombre} · ya estaba registrado`]);
    expect(filas[0]).toMatchObject({ accion: "Registró asistencia con código QR", usuarioId: profesor.id, entidadId: c.id });
  });

  test("CP-180 · un escaneo rechazado no se anota en la bitácora", async () => {
    const c = await clase();
    await escanear(c.id, "codigo-falso");

    expect(await prisma.bitacora.count()).toBe(0);
  });
});
