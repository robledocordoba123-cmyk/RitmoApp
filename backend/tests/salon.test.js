const request = require("supertest");
const app = require("../src/app");
const { limpiarBD, prisma } = require("./helpers/db");
const { crearAcademia, crearUsuario, crearSalon, crearRitmo } = require("./helpers/fixtures");
const { login } = require("./helpers/auth");

// AM-01 (DOC-07): salones no tenía archivo de pruebas propio (72 % de cobertura).
// El aislamiento entre academias de salones ya lo prueba CP-045 y CP-046.

let academia;
let tokenAdmin;

beforeEach(async () => {
  await limpiarBD();
  academia = await crearAcademia();
  await crearUsuario(academia.id, "ADMIN_ACADEMIA", { email: "admin@salon.test" });
  tokenAdmin = await login("admin@salon.test");
});

afterAll(async () => {
  await prisma.$disconnect();
});

function comoAdmin(peticion) {
  return peticion.set("Authorization", `Bearer ${tokenAdmin}`);
}

describe("RF-18: salones de la academia", () => {
  test("CP-105 · lista solo los salones de su academia, en orden alfabético", async () => {
    const otraAcademia = await crearAcademia({ nombre: "Otra Academia" });
    await crearSalon(academia.id, { nombre: "Salón Espejos" });
    await crearSalon(academia.id, { nombre: "Estudio Urbano" });
    await crearSalon(otraAcademia.id, { nombre: "Salón Ajeno" });

    const res = await comoAdmin(request(app).get("/api/salones"));

    expect(res.status).toBe(200);
    expect(res.body.map((s) => s.nombre)).toEqual(["Estudio Urbano", "Salón Espejos"]);
  });

  test("CP-106 · crea un salón válido y guarda el nombre sin espacios de más (201)", async () => {
    const res = await comoAdmin(request(app).post("/api/salones")).send({ nombre: "  Salón 3  ", capacidad: 15 });

    expect(res.status).toBe(201);
    expect(res.body.nombre).toBe("Salón 3");
    expect(res.body.capacidad).toBe(15);
    expect(res.body.activo).toBe(true);
  });

  test("CP-107 · rechaza un salón sin nombre o con capacidad que no es un entero positivo (400)", async () => {
    const invalidos = [
      { capacidad: 10 },
      { nombre: "   ", capacidad: 10 },
      { nombre: "Salón", capacidad: 0 },
      { nombre: "Salón", capacidad: -3 },
      { nombre: "Salón", capacidad: 2.5 },
      { nombre: "Salón", capacidad: "20" },
    ];

    for (const datos of invalidos) {
      const res = await comoAdmin(request(app).post("/api/salones")).send(datos);
      expect(res.status).toBe(400);
    }
    expect(await prisma.salon.count()).toBe(0);
  });

  test("CP-108 · actualiza nombre, capacidad y estado de un salón (200)", async () => {
    const salon = await crearSalon(academia.id, { nombre: "Salón 1", capacidad: 20 });

    const res = await comoAdmin(request(app).put(`/api/salones/${salon.id}`)).send({
      nombre: "Salón principal",
      capacidad: 25,
      activo: false,
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ nombre: "Salón principal", capacidad: 25, activo: false });
  });

  test("CP-109 · rechaza una actualización con datos inválidos y no cambia el salón (400)", async () => {
    const salon = await crearSalon(academia.id, { nombre: "Salón 1", capacidad: 20 });
    const invalidos = [{ nombre: "  " }, { capacidad: 0 }, { capacidad: "veinte" }, { activo: "no" }];

    for (const datos of invalidos) {
      const res = await comoAdmin(request(app).put(`/api/salones/${salon.id}`)).send(datos);
      expect(res.status).toBe(400);
    }
    const guardado = await prisma.salon.findUnique({ where: { id: salon.id } });
    expect(guardado).toMatchObject({ nombre: "Salón 1", capacidad: 20, activo: true });
  });

  test("CP-110 · elimina un salón sin clases (204), pero no uno con clases (409)", async () => {
    const libre = await crearSalon(academia.id, { nombre: "Libre" });
    const ocupado = await crearSalon(academia.id, { nombre: "Ocupado" });
    const ritmo = await crearRitmo(academia.id);
    const profesor = await crearUsuario(academia.id, "PROFESOR");
    await prisma.clase.create({
      data: {
        tenantId: academia.id,
        ritmoId: ritmo.id,
        salonId: ocupado.id,
        profesorId: profesor.id,
        cupoMaximo: 10,
        cuposDisponibles: 10,
        fechaHoraInicio: new Date("2027-01-10T18:00:00.000Z"),
        fechaHoraFin: new Date("2027-01-10T19:00:00.000Z"),
      },
    });

    const borrarLibre = await comoAdmin(request(app).delete(`/api/salones/${libre.id}`));
    const borrarOcupado = await comoAdmin(request(app).delete(`/api/salones/${ocupado.id}`));

    expect(borrarLibre.status).toBe(204);
    expect(borrarOcupado.status).toBe(409);
    expect(await prisma.salon.findUnique({ where: { id: ocupado.id } })).not.toBeNull();
  });

  test("CP-111 · un profesor no puede gestionar salones (403)", async () => {
    await crearUsuario(academia.id, "PROFESOR", { email: "profe@salon.test" });
    const tokenProfe = await login("profe@salon.test");

    const res = await request(app)
      .post("/api/salones")
      .set("Authorization", `Bearer ${tokenProfe}`)
      .send({ nombre: "Salón 9", capacidad: 10 });

    expect(res.status).toBe(403);
    expect(await prisma.salon.count()).toBe(0);
  });
});
