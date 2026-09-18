const request = require("supertest");
const app = require("../src/app");
const { limpiarBD, prisma } = require("./helpers/db");
const { crearAcademia, crearUsuario, crearSalon, crearRitmo } = require("./helpers/fixtures");
const { login } = require("./helpers/auth");

let tokenAdmin;
let profesor;
let salon;
let ritmo;

beforeEach(async () => {
  await limpiarBD();
  const academia = await crearAcademia();
  await crearUsuario(academia.id, "ADMIN_ACADEMIA", { email: "admin@clase.test" });
  profesor = await crearUsuario(academia.id, "PROFESOR", { email: "profe@clase.test" });
  salon = await crearSalon(academia.id);
  ritmo = await crearRitmo(academia.id);
  tokenAdmin = await login("admin@clase.test");
});

afterAll(async () => {
  await prisma.$disconnect();
});

function crearClasePayload(overrides = {}) {
  return {
    ritmoId: ritmo.id,
    salonId: salon.id,
    profesorId: profesor.id,
    cupoMaximo: 5,
    fechaHoraInicio: "2027-01-10T18:00:00.000Z",
    fechaHoraFin: "2027-01-10T19:00:00.000Z",
    ...overrides,
  };
}

describe("RF-05: programación de clases", () => {
  test("crea una clase válida", async () => {
    const res = await request(app).post("/api/clases").set("Authorization", `Bearer ${tokenAdmin}`).send(crearClasePayload());
    expect(res.status).toBe(201);
    expect(res.body.cuposDisponibles).toBe(5);
  });

  test("RN-02: rechaza un cruce de horario en el mismo salón (409)", async () => {
    await request(app).post("/api/clases").set("Authorization", `Bearer ${tokenAdmin}`).send(crearClasePayload());

    const otroProfesor = await crearUsuario((await prisma.tenant.findFirst()).id, "PROFESOR", { email: "profe2@clase.test" });

    const res = await request(app)
      .post("/api/clases")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send(
        crearClasePayload({
          profesorId: otroProfesor.id,
          fechaHoraInicio: "2027-01-10T18:30:00.000Z",
          fechaHoraFin: "2027-01-10T19:30:00.000Z",
        })
      );
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/RN-02/);
  });

  test("RN-03: rechaza al mismo profesor en dos salones a la vez (409)", async () => {
    await request(app).post("/api/clases").set("Authorization", `Bearer ${tokenAdmin}`).send(crearClasePayload());

    const otroSalon = await crearSalon((await prisma.tenant.findFirst()).id, { nombre: "Salón 2" });

    const res = await request(app)
      .post("/api/clases")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send(
        crearClasePayload({
          salonId: otroSalon.id,
          fechaHoraInicio: "2027-01-10T18:30:00.000Z",
          fechaHoraFin: "2027-01-10T19:30:00.000Z",
        })
      );
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/RN-03/);
  });

  test("permite horarios distintos sin cruce", async () => {
    await request(app).post("/api/clases").set("Authorization", `Bearer ${tokenAdmin}`).send(crearClasePayload());

    const res = await request(app)
      .post("/api/clases")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send(
        crearClasePayload({
          fechaHoraInicio: "2027-01-10T20:00:00.000Z",
          fechaHoraFin: "2027-01-10T21:00:00.000Z",
        })
      );
    expect(res.status).toBe(201);
  });
});
