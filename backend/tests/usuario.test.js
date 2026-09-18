const request = require("supertest");
const app = require("../src/app");
const { limpiarBD, prisma } = require("./helpers/db");
const { crearAcademia, crearUsuario } = require("./helpers/fixtures");
const { login } = require("./helpers/auth");

beforeEach(async () => {
  await limpiarBD();
});

afterAll(async () => {
  await prisma.$disconnect();
});

// El admin necesita esta lista para poder asignar un profesor al programar
// una clase (RF-05).
describe("GET /api/usuarios: listar por rol", () => {
  test("el admin lista solo los profesores de su propia academia", async () => {
    const academiaA = await crearAcademia();
    const academiaB = await crearAcademia();
    await crearUsuario(academiaA.id, "ADMIN_ACADEMIA", { email: "admin@usuarios.test" });
    await crearUsuario(academiaA.id, "PROFESOR", { email: "profeA@usuarios.test", nombre: "Profe A" });
    await crearUsuario(academiaB.id, "PROFESOR", { email: "profeB@usuarios.test", nombre: "Profe B" });

    const token = await login("admin@usuarios.test");
    const res = await request(app).get("/api/usuarios?rol=PROFESOR").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].nombre).toBe("Profe A");
  });

  test("rechaza un rol no consultable (400)", async () => {
    const academia = await crearAcademia();
    await crearUsuario(academia.id, "ADMIN_ACADEMIA", { email: "admin2@usuarios.test" });
    const token = await login("admin2@usuarios.test");

    const res = await request(app).get("/api/usuarios?rol=SUPERADMIN").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(400);
  });
});
