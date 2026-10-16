const request = require("supertest");
const app = require("../src/app");
const correo = require("../src/utils/correo");
const { limpiarBD, prisma } = require("./helpers/db");
const { crearAcademia, crearUsuario, crearSalon, crearRitmo, darMembresia } = require("./helpers/fixtures");
const { enviarRecordatoriosDeClase, avisarMembresiasPorVencer, rangoDelDia } = require("../src/utils/notificaciones");

// OE-6: notificaciones programadas (la tarea diaria de las 7:00 a. m.).

const UN_DIA = 24 * 60 * 60 * 1000;
// 16/10/2026 a las 7:00 a. m. de Colombia: el "hoy" de las pruebas.
const AHORA = new Date("2026-10-16T12:00:00Z");

let academia;
let profesor;
let enviar;

beforeEach(async () => {
  await limpiarBD();
  academia = await crearAcademia();
  profesor = await crearUsuario(academia.id, "PROFESOR", { email: "profe@prog.test" });
  enviar = jest.spyOn(correo, "enviarCorreo").mockResolvedValue(undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
  delete process.env.TAREAS_TOKEN;
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function claseEl(inicio, tenantId = academia.id, profesorId = profesor.id, estado = "PROGRAMADA") {
  const salon = await crearSalon(tenantId);
  const ritmo = await crearRitmo(tenantId, { nombre: "Salsa" });
  return prisma.clase.create({
    data: {
      tenantId, ritmoId: ritmo.id, salonId: salon.id, profesorId, estado,
      cupoMaximo: 10, cuposDisponibles: 9, fechaHoraInicio: inicio, fechaHoraFin: new Date(inicio.getTime() + 3600000),
    },
  });
}

async function reservar(c, email, tenantId = academia.id) {
  const e = await crearUsuario(tenantId, "ESTUDIANTE", { email });
  await prisma.reserva.create({ data: { tenantId, claseId: c.id, estudianteId: e.id } });
  return e;
}

function destinatarios() {
  return enviar.mock.calls.map(([m]) => m.para).sort();
}

describe("OE-6: notificaciones programadas", () => {
  test("CP-151 · el día se calcula en hora de Colombia, no en UTC", () => {
    // 16/10 a las 9:30 p. m. en Colombia ya es 17/10 en UTC; "mañana" sigue siendo el 17.
    const { fecha, inicio } = rangoDelDia(new Date("2026-10-17T02:30:00Z"), 1);
    expect(fecha).toBe("2026-10-17");
    expect(inicio.toISOString()).toBe("2026-10-17T05:00:00.000Z");
  });

  test("CP-152 · recuerda solo las clases de mañana a los inscritos confirmados, y no repite si corre dos veces", async () => {
    const manana = await claseEl(new Date("2026-10-17T23:00:00Z")); // 17/10, 6:00 p. m. Colombia
    const hoy = await claseEl(new Date("2026-10-16T23:00:00Z"));
    const pasado = await claseEl(new Date("2026-10-18T23:00:00Z"));
    const cancelada = await claseEl(new Date("2026-10-17T22:00:00Z"), academia.id, profesor.id, "CANCELADA");
    await reservar(manana, "ana@prog.test");
    await reservar(hoy, "beto@prog.test");
    await reservar(pasado, "cami@prog.test");
    await reservar(cancelada, "dani@prog.test");
    const eli = await reservar(manana, "eli@prog.test");
    await prisma.reserva.updateMany({ where: { estudianteId: eli.id }, data: { estado: "CANCELADA" } });

    expect(await enviarRecordatoriosDeClase(prisma, AHORA)).toBe(1);
    expect(await enviarRecordatoriosDeClase(prisma, AHORA)).toBe(0);
    expect(destinatarios()).toEqual(["ana@prog.test"]);
    expect(enviar.mock.calls[0][0].asunto).toBe("Mañana tienes clase: Salsa");
  });

  test("CP-153 · no recuerda clases de academias suspendidas", async () => {
    const otra = await crearAcademia({ estado: "SUSPENDIDA" });
    const profeOtra = await crearUsuario(otra.id, "PROFESOR");
    const c = await claseEl(new Date("2026-10-17T23:00:00Z"), otra.id, profeOtra.id);
    await reservar(c, "fer@prog.test", otra.id);

    expect(await enviarRecordatoriosDeClase(prisma, AHORA)).toBe(0);
  });

  test("CP-154 · avisa la membresía que vence en 3 días (según su último pago) y no repite", async () => {
    const ana = await crearUsuario(academia.id, "ESTUDIANTE", { email: "ana@prog.test", membresia: false });
    await darMembresia(academia.id, ana.id, { vigenteHasta: new Date(AHORA.getTime() + 3 * UN_DIA) });
    const beto = await crearUsuario(academia.id, "ESTUDIANTE", { email: "beto@prog.test", membresia: false });
    await darMembresia(academia.id, beto.id, { vigenteHasta: new Date(AHORA.getTime() + 3 * UN_DIA) });
    await darMembresia(academia.id, beto.id, { vigenteHasta: new Date(AHORA.getTime() + 33 * UN_DIA) }); // ya renovó
    const cami = await crearUsuario(academia.id, "ESTUDIANTE", { email: "cami@prog.test", membresia: false });
    await darMembresia(academia.id, cami.id, { vigenteHasta: new Date(AHORA.getTime() + 10 * UN_DIA) });

    expect(await avisarMembresiasPorVencer(prisma, AHORA)).toBe(1);
    expect(await avisarMembresiasPorVencer(prisma, AHORA)).toBe(0);
    expect(destinatarios()).toEqual(["ana@prog.test"]);
    expect(enviar.mock.calls[0][0].texto).toMatch(/19 de octubre de 2026/);
  });

  test("CP-155 · la ruta de tareas exige la clave: sin configurar 404, clave mala 401, clave buena 200", async () => {
    const sinConfigurar = await request(app).post("/api/tareas/diarias");
    process.env.TAREAS_TOKEN = "clave-de-prueba-larga";
    const sinClave = await request(app).post("/api/tareas/diarias");
    const mala = await request(app).post("/api/tareas/diarias").set("Authorization", "Bearer otra-clave");
    const buena = await request(app).post("/api/tareas/diarias").set("Authorization", "Bearer clave-de-prueba-larga");

    expect(sinConfigurar.status).toBe(404);
    expect(sinClave.status).toBe(401);
    expect(mala.status).toBe(401);
    expect(buena.status).toBe(200);
    expect(buena.body).toEqual({ recordatorios: 0, avisosMembresia: 0 });
  });
});
