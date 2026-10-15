const request = require("supertest");
const app = require("../src/app");
const { limpiarBD, prisma } = require("./helpers/db");
const { crearAcademia, crearUsuario, crearSalon, crearRitmo } = require("./helpers/fixtures");
const { login } = require("./helpers/auth");

// AM-01 (DOC-07): ritmo.controller.js tenía 4 % de cobertura.

let academia;
let otraAcademia;
let tokenAdmin;

beforeEach(async () => {
  await limpiarBD();
  academia = await crearAcademia();
  otraAcademia = await crearAcademia({ nombre: "Otra Academia" });
  await crearUsuario(academia.id, "ADMIN_ACADEMIA", { email: "admin@ritmo.test" });
  tokenAdmin = await login("admin@ritmo.test");
});

afterAll(async () => {
  await prisma.$disconnect();
});

function comoAdmin(peticion) {
  return peticion.set("Authorization", `Bearer ${tokenAdmin}`);
}

describe("RF-18: catálogo de ritmos de la academia", () => {
  test("CP-095 · lista solo los ritmos de su academia, en orden alfabético", async () => {
    await crearRitmo(academia.id, { nombre: "Salsa" });
    await crearRitmo(academia.id, { nombre: "Bachata" });
    await crearRitmo(otraAcademia.id, { nombre: "Tango" });

    const res = await comoAdmin(request(app).get("/api/ritmos"));

    expect(res.status).toBe(200);
    expect(res.body.map((r) => r.nombre)).toEqual(["Bachata", "Salsa"]);
  });

  test("CP-096 · crea un ritmo válido en su academia (201)", async () => {
    const res = await comoAdmin(request(app).post("/api/ritmos")).send({ nombre: "Kizomba" });

    expect(res.status).toBe(201);
    expect(res.body.nombre).toBe("Kizomba");
    expect(res.body.tenantId).toBe(academia.id);
  });

  test("CP-097 · rechaza un ritmo sin nombre o con solo espacios (400)", async () => {
    const sinNombre = await comoAdmin(request(app).post("/api/ritmos")).send({});
    const soloEspacios = await comoAdmin(request(app).post("/api/ritmos")).send({ nombre: "   " });

    expect(sinNombre.status).toBe(400);
    expect(soloEspacios.status).toBe(400);
    expect(await prisma.ritmo.count()).toBe(0);
  });

  test("CP-098 · guarda el nombre sin espacios de más", async () => {
    const res = await comoAdmin(request(app).post("/api/ritmos")).send({ nombre: "  Salsa caleña  " });

    expect(res.status).toBe(201);
    expect(res.body.nombre).toBe("Salsa caleña");
  });

  test("CP-099 · actualiza el nombre de un ritmo (200)", async () => {
    const ritmo = await crearRitmo(academia.id, { nombre: "Salsa" });

    const res = await comoAdmin(request(app).put(`/api/ritmos/${ritmo.id}`)).send({ nombre: "Salsa en línea" });

    expect(res.status).toBe(200);
    expect(res.body.nombre).toBe("Salsa en línea");
  });

  test("CP-100 · rechaza una actualización sin nombre válido (400)", async () => {
    const ritmo = await crearRitmo(academia.id, { nombre: "Salsa" });

    const sinNombre = await comoAdmin(request(app).put(`/api/ritmos/${ritmo.id}`)).send({});
    const soloEspacios = await comoAdmin(request(app).put(`/api/ritmos/${ritmo.id}`)).send({ nombre: " " });

    expect(sinNombre.status).toBe(400);
    expect(soloEspacios.status).toBe(400);
    expect((await prisma.ritmo.findUnique({ where: { id: ritmo.id } })).nombre).toBe("Salsa");
  });

  test("CP-101 · elimina un ritmo sin clases (204)", async () => {
    const ritmo = await crearRitmo(academia.id);

    const res = await comoAdmin(request(app).delete(`/api/ritmos/${ritmo.id}`));

    expect(res.status).toBe(204);
    expect(await prisma.ritmo.findUnique({ where: { id: ritmo.id } })).toBeNull();
  });

  test("CP-102 · no elimina un ritmo que tiene clases (409)", async () => {
    const ritmo = await crearRitmo(academia.id);
    const salon = await crearSalon(academia.id);
    const profesor = await crearUsuario(academia.id, "PROFESOR");
    await prisma.clase.create({
      data: {
        tenantId: academia.id,
        ritmoId: ritmo.id,
        salonId: salon.id,
        profesorId: profesor.id,
        cupoMaximo: 10,
        cuposDisponibles: 10,
        fechaHoraInicio: new Date("2027-01-10T18:00:00.000Z"),
        fechaHoraFin: new Date("2027-01-10T19:00:00.000Z"),
      },
    });

    const res = await comoAdmin(request(app).delete(`/api/ritmos/${ritmo.id}`));

    expect(res.status).toBe(409);
    expect(await prisma.ritmo.findUnique({ where: { id: ritmo.id } })).not.toBeNull();
  });
});

describe("RNF-01 · RN-04: los ritmos de otra academia no se tocan", () => {
  test("CP-103 · no puede editar ni borrar un ritmo de otra academia (404)", async () => {
    const ajeno = await crearRitmo(otraAcademia.id, { nombre: "Tango" });

    const editar = await comoAdmin(request(app).put(`/api/ritmos/${ajeno.id}`)).send({ nombre: "Hackeado" });
    const borrar = await comoAdmin(request(app).delete(`/api/ritmos/${ajeno.id}`));

    expect(editar.status).toBe(404);
    expect(borrar.status).toBe(404);
    expect((await prisma.ritmo.findUnique({ where: { id: ajeno.id } })).nombre).toBe("Tango");
  });

  test("CP-104 · un profesor no puede gestionar ritmos (403)", async () => {
    await crearUsuario(academia.id, "PROFESOR", { email: "profe@ritmo.test" });
    const tokenProfe = await login("profe@ritmo.test");

    const res = await request(app)
      .post("/api/ritmos")
      .set("Authorization", `Bearer ${tokenProfe}`)
      .send({ nombre: "Merengue" });

    expect(res.status).toBe(403);
    expect(await prisma.ritmo.count()).toBe(0);
  });
});
