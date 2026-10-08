const request = require("supertest");
const app = require("../src/app");
const { limpiarBD, prisma } = require("./helpers/db");
const { crearAcademia, crearUsuario, crearSalon, crearRitmo } = require("./helpers/fixtures");
const { login } = require("./helpers/auth");

let tenant;
let tokenAdmin;
let profesor;

beforeEach(async () => {
  await limpiarBD();
  tenant = await crearAcademia();
  await crearUsuario(tenant.id, "ADMIN_ACADEMIA", { email: "admin@reserva.test" });
  profesor = await crearUsuario(tenant.id, "PROFESOR", { email: "profe@reserva.test" });
  tokenAdmin = await login("admin@reserva.test");
});

afterAll(async () => {
  await prisma.$disconnect();
});

// La clase siempre queda 30 días en el futuro. Con una fecha fija, estas
// pruebas empezarían a fallar solas el día que esa fecha quedara en el pasado.
const EN_30_DIAS = Date.now() + 30 * 24 * 60 * 60 * 1000;
const INICIO_CLASE = new Date(EN_30_DIAS).toISOString();
const FIN_CLASE = new Date(EN_30_DIAS + 60 * 60 * 1000).toISOString();

async function crearClase(cupoMaximo, overrides = {}) {
  const salon = await crearSalon(tenant.id, { nombre: `Salón ${Math.random()}` });
  const ritmo = await crearRitmo(tenant.id);
  const res = await request(app)
    .post("/api/clases")
    .set("Authorization", `Bearer ${tokenAdmin}`)
    .send({
      ritmoId: ritmo.id,
      salonId: salon.id,
      profesorId: profesor.id,
      cupoMaximo,
      fechaHoraInicio: INICIO_CLASE,
      fechaHoraFin: FIN_CLASE,
      ...overrides,
    });
  return res.body;
}

describe("RF-09 · HU-09: reserva de cupo (RN-01, RN-16, RNF-02)", () => {
  test("CP-026 · reserva correctamente y decrementa el cupo", async () => {
    const clase = await crearClase(3);
    const estudiante = await crearUsuario(tenant.id, "ESTUDIANTE", { email: "est1@reserva.test" });
    const tokenEst = await login("est1@reserva.test");

    const res = await request(app).post("/api/reservas").set("Authorization", `Bearer ${tokenEst}`).send({ claseId: clase.id });
    expect(res.status).toBe(201);

    const claseActualizada = await prisma.clase.findUnique({ where: { id: clase.id } });
    expect(claseActualizada.cuposDisponibles).toBe(2);
  });

  test("CP-027 · rechaza reservar dos veces la misma clase sin perder un cupo (409)", async () => {
    const clase = await crearClase(3);
    const estudiante = await crearUsuario(tenant.id, "ESTUDIANTE", { email: "est2@reserva.test" });
    const tokenEst = await login("est2@reserva.test");

    await request(app).post("/api/reservas").set("Authorization", `Bearer ${tokenEst}`).send({ claseId: clase.id });
    const segundo = await request(app).post("/api/reservas").set("Authorization", `Bearer ${tokenEst}`).send({ claseId: clase.id });

    expect(segundo.status).toBe(409);

    const claseActualizada = await prisma.clase.findUnique({ where: { id: clase.id } });
    expect(claseActualizada.cuposDisponibles).toBe(2); // solo se descontó una vez
  });

  test("CP-028 · rechaza reservar cuando ya no hay cupo (400)", async () => {
    const clase = await crearClase(1);
    const est1 = await crearUsuario(tenant.id, "ESTUDIANTE", { email: "est3@reserva.test" });
    const est2 = await crearUsuario(tenant.id, "ESTUDIANTE", { email: "est4@reserva.test" });
    const tokenEst1 = await login("est3@reserva.test");
    const tokenEst2 = await login("est4@reserva.test");

    const primero = await request(app).post("/api/reservas").set("Authorization", `Bearer ${tokenEst1}`).send({ claseId: clase.id });
    expect(primero.status).toBe(201);

    const segundo = await request(app).post("/api/reservas").set("Authorization", `Bearer ${tokenEst2}`).send({ claseId: clase.id });
    expect(segundo.status).toBe(400);
  });

  test("CP-029 · RNF-02: bajo concurrencia real, dos estudiantes pidiendo el último cupo — solo uno gana", async () => {
    const clase = await crearClase(1);
    const est1 = await crearUsuario(tenant.id, "ESTUDIANTE", { email: "race1@reserva.test" });
    const est2 = await crearUsuario(tenant.id, "ESTUDIANTE", { email: "race2@reserva.test" });
    const tokenEst1 = await login("race1@reserva.test");
    const tokenEst2 = await login("race2@reserva.test");

    const [res1, res2] = await Promise.all([
      request(app).post("/api/reservas").set("Authorization", `Bearer ${tokenEst1}`).send({ claseId: clase.id }),
      request(app).post("/api/reservas").set("Authorization", `Bearer ${tokenEst2}`).send({ claseId: clase.id }),
    ]);

    const codigos = [res1.status, res2.status].sort();
    expect(codigos).toEqual([201, 400]);

    const reservasConfirmadas = await prisma.reserva.count({ where: { claseId: clase.id, estado: "CONFIRMADA" } });
    expect(reservasConfirmadas).toBe(1);

    const claseFinal = await prisma.clase.findUnique({ where: { id: clase.id } });
    expect(claseFinal.cuposDisponibles).toBe(0);
  });
});

describe("RF-10 · HU-10: cancelación de reserva (RN-10)", () => {
  async function reservarComo(email, clase) {
    await crearUsuario(tenant.id, "ESTUDIANTE", { email });
    const token = await login(email);
    const res = await request(app).post("/api/reservas").set("Authorization", `Bearer ${token}`).send({ claseId: clase.id });
    return { token, reserva: res.body };
  }

  function cancelarReserva(id, token) {
    return request(app).patch(`/api/reservas/${id}/cancelar`).set("Authorization", `Bearer ${token}`);
  }

  test("CP-030 · cancela la reserva y el cupo vuelve a quedar libre", async () => {
    const clase = await crearClase(1);
    const { token, reserva } = await reservarComo("cancela@reserva.test", clase);

    const res = await cancelarReserva(reserva.id, token);
    expect(res.status).toBe(200);

    const claseActualizada = await prisma.clase.findUnique({ where: { id: clase.id } });
    expect(claseActualizada.cuposDisponibles).toBe(1);
    const reservaActualizada = await prisma.reserva.findUnique({ where: { id: reserva.id } });
    expect(reservaActualizada.estado).toBe("CANCELADA");
  });

  test("CP-031 · cancelar dos veces no devuelve el cupo dos veces (409)", async () => {
    const clase = await crearClase(2);
    const { token, reserva } = await reservarComo("doble@reserva.test", clase);

    await cancelarReserva(reserva.id, token);
    const segunda = await cancelarReserva(reserva.id, token);
    expect(segunda.status).toBe(409);

    const claseActualizada = await prisma.clase.findUnique({ where: { id: clase.id } });
    expect(claseActualizada.cuposDisponibles).toBe(2);
  });

  test("CP-032 · después de cancelar, el estudiante puede volver a reservar la misma clase", async () => {
    const clase = await crearClase(1);
    const { token, reserva } = await reservarComo("vuelve@reserva.test", clase);
    await cancelarReserva(reserva.id, token);

    const res = await request(app).post("/api/reservas").set("Authorization", `Bearer ${token}`).send({ claseId: clase.id });
    expect(res.status).toBe(201);
    expect(res.body.estado).toBe("CONFIRMADA");

    const claseActualizada = await prisma.clase.findUnique({ where: { id: clase.id } });
    expect(claseActualizada.cuposDisponibles).toBe(0);
  });

  test("CP-033 · un estudiante no puede cancelar la reserva de otro (404)", async () => {
    const clase = await crearClase(2);
    const { reserva } = await reservarComo("duena@reserva.test", clase);
    await crearUsuario(tenant.id, "ESTUDIANTE", { email: "intrusa@reserva.test" });
    const tokenIntrusa = await login("intrusa@reserva.test");

    const res = await cancelarReserva(reserva.id, tokenIntrusa);
    expect(res.status).toBe(404);
  });

  test("CP-034 · no se puede cancelar una clase que ya empezó (400)", async () => {
    const clase = await crearClase(2);
    const { token, reserva } = await reservarComo("tarde@reserva.test", clase);
    await prisma.clase.update({ where: { id: clase.id }, data: { fechaHoraInicio: new Date(Date.now() - 60 * 1000) } });

    const res = await cancelarReserva(reserva.id, token);
    expect(res.status).toBe(400);
  });
});

describe("RF-09 · HU-09: no reservar dos clases que se cruzan (RN-16)", () => {
  const UNA_HORA = 60 * 60 * 1000;

  async function reservar(token, claseId) {
    return request(app).post("/api/reservas").set("Authorization", `Bearer ${token}`).send({ claseId });
  }

  test("CP-084 · rechaza una clase que se cruza con otra ya reservada, sin descontar cupo (HU-09-CA-03)", async () => {
    const otroProfe = await crearUsuario(tenant.id, "PROFESOR");
    const primera = await crearClase(5);
    // Empieza 30 minutos después de la primera: se cruzan.
    const segunda = await crearClase(5, {
      profesorId: otroProfe.id,
      fechaHoraInicio: new Date(EN_30_DIAS + UNA_HORA / 2).toISOString(),
      fechaHoraFin: new Date(EN_30_DIAS + UNA_HORA * 1.5).toISOString(),
    });
    await crearUsuario(tenant.id, "ESTUDIANTE", { email: "cruce@reserva.test" });
    const token = await login("cruce@reserva.test");

    expect((await reservar(token, primera.id)).status).toBe(201);
    const res = await reservar(token, segunda.id);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/se cruza/);
    expect((await prisma.clase.findUnique({ where: { id: segunda.id } })).cuposDisponibles).toBe(5);
  });

  test("CP-085 · permite reservar una clase que empieza justo cuando termina la otra", async () => {
    const otroProfe = await crearUsuario(tenant.id, "PROFESOR");
    const primera = await crearClase(5);
    const seguida = await crearClase(5, {
      profesorId: otroProfe.id,
      fechaHoraInicio: FIN_CLASE,
      fechaHoraFin: new Date(EN_30_DIAS + UNA_HORA * 2).toISOString(),
    });
    await crearUsuario(tenant.id, "ESTUDIANTE", { email: "seguidas@reserva.test" });
    const token = await login("seguidas@reserva.test");

    expect((await reservar(token, primera.id)).status).toBe(201);
    expect((await reservar(token, seguida.id)).status).toBe(201);
  });
});
