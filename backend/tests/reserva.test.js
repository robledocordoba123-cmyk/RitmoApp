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
      fechaHoraInicio: "2027-02-01T18:00:00.000Z",
      fechaHoraFin: "2027-02-01T19:00:00.000Z",
      ...overrides,
    });
  return res.body;
}

describe("RF-06 / RN-01: reserva de cupo", () => {
  test("reserva correctamente y decrementa el cupo", async () => {
    const clase = await crearClase(3);
    const estudiante = await crearUsuario(tenant.id, "ESTUDIANTE", { email: "est1@reserva.test" });
    const tokenEst = await login("est1@reserva.test");

    const res = await request(app).post("/api/reservas").set("Authorization", `Bearer ${tokenEst}`).send({ claseId: clase.id });
    expect(res.status).toBe(201);

    const claseActualizada = await prisma.clase.findUnique({ where: { id: clase.id } });
    expect(claseActualizada.cuposDisponibles).toBe(2);
  });

  test("rechaza reservar dos veces la misma clase sin perder un cupo (409)", async () => {
    const clase = await crearClase(3);
    const estudiante = await crearUsuario(tenant.id, "ESTUDIANTE", { email: "est2@reserva.test" });
    const tokenEst = await login("est2@reserva.test");

    await request(app).post("/api/reservas").set("Authorization", `Bearer ${tokenEst}`).send({ claseId: clase.id });
    const segundo = await request(app).post("/api/reservas").set("Authorization", `Bearer ${tokenEst}`).send({ claseId: clase.id });

    expect(segundo.status).toBe(409);

    const claseActualizada = await prisma.clase.findUnique({ where: { id: clase.id } });
    expect(claseActualizada.cuposDisponibles).toBe(2); // solo se descontó una vez
  });

  test("rechaza reservar cuando ya no hay cupo (400)", async () => {
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

  test("RNF-02: bajo concurrencia real, dos estudiantes pidiendo el último cupo — solo uno gana", async () => {
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
