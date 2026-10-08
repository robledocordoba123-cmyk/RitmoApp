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

describe("RF-14 · HU-14: programación de clases (RN-02, RN-03)", () => {
  test("CP-021 · crea una clase válida", async () => {
    const res = await request(app).post("/api/clases").set("Authorization", `Bearer ${tokenAdmin}`).send(crearClasePayload());
    expect(res.status).toBe(201);
    expect(res.body.cuposDisponibles).toBe(5);
  });

  test("CP-022 · rechaza un cupo mayor que la capacidad del salón (400)", async () => {
    // El salón de prueba tiene capacidad 20.
    const res = await request(app)
      .post("/api/clases")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send(crearClasePayload({ cupoMaximo: 25 }));
    expect(res.status).toBe(400);
  });

  test("CP-023 · RN-02: rechaza un cruce de horario en el mismo salón (409)", async () => {
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

  test("CP-024 · RN-03: rechaza al mismo profesor en dos salones a la vez (409)", async () => {
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

  test("CP-025 · permite horarios distintos sin cruce", async () => {
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

describe("RF-08 · HU-08: catálogo con filtros por ritmo y día", () => {
  async function clase(ritmoId, inicioISO) {
    const inicio = new Date(inicioISO);
    return prisma.clase.create({
      data: {
        tenantId: salon.tenantId,
        ritmoId,
        salonId: salon.id,
        profesorId: profesor.id,
        cupoMaximo: 5,
        cuposDisponibles: 5,
        fechaHoraInicio: inicio,
        fechaHoraFin: new Date(inicio.getTime() + 60 * 60 * 1000),
      },
    });
  }

  function listar(query) {
    return request(app).get(`/api/clases?${query}`).set("Authorization", `Bearer ${tokenAdmin}`);
  }

  test("CP-082 · filtra por ritmo y por día de calendario en Colombia (HU-08-CA-01)", async () => {
    const bachata = await crearRitmo(salon.tenantId, { nombre: "Bachata" });
    await clase(ritmo.id, "2027-03-05T18:00:00-05:00");
    await clase(bachata.id, "2027-03-05T20:00:00-05:00");
    await clase(bachata.id, "2027-03-06T18:00:00-05:00");

    const porRitmo = await listar(`ritmoId=${bachata.id}`);
    expect(porRitmo.body).toHaveLength(2);

    // 8:00 p. m. en Colombia ya es el día siguiente en UTC; aun así cuenta para el 5.
    const porDia = await listar("fecha=2027-03-05");
    expect(porDia.body).toHaveLength(2);

    const ambos = await listar(`ritmoId=${bachata.id}&fecha=2027-03-05`);
    expect(ambos.body).toHaveLength(1);
  });

  test("CP-083 · sin resultados responde una lista vacía y rechaza fechas mal escritas (HU-08-CA-02)", async () => {
    await clase(ritmo.id, "2027-03-05T18:00:00-05:00");

    const vacio = await listar("fecha=2027-04-01");
    expect(vacio.status).toBe(200);
    expect(vacio.body).toEqual([]);
    expect((await listar("fecha=05-03-2027")).status).toBe(400);
  });
});
