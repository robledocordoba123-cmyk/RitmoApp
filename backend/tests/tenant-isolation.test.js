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

// RNF-01 / RN-04: una academia nunca debe ver ni poder tocar los datos de otra.
describe("Aislamiento multi-tenant", () => {
  test("un admin no ve los salones de otra academia", async () => {
    const academiaA = await crearAcademia({ nit: "AAA-1" });
    const academiaB = await crearAcademia({ nit: "BBB-1" });
    await crearUsuario(academiaA.id, "ADMIN_ACADEMIA", { email: "adminA@test.com" });
    await crearUsuario(academiaB.id, "ADMIN_ACADEMIA", { email: "adminB@test.com" });

    const tokenA = await login("adminA@test.com");
    const tokenB = await login("adminB@test.com");

    await request(app)
      .post("/api/salones")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ nombre: "Salón de A", capacidad: 10 });

    const resB = await request(app).get("/api/salones").set("Authorization", `Bearer ${tokenB}`);
    expect(resB.body).toEqual([]);

    const resA = await request(app).get("/api/salones").set("Authorization", `Bearer ${tokenA}`);
    expect(resA.body).toHaveLength(1);
  });

  test("un admin no puede editar ni borrar un salón de otra academia (404)", async () => {
    const academiaA = await crearAcademia({ nit: "CCC-1" });
    const academiaB = await crearAcademia({ nit: "DDD-1" });
    await crearUsuario(academiaA.id, "ADMIN_ACADEMIA", { email: "adminC@test.com" });
    await crearUsuario(academiaB.id, "ADMIN_ACADEMIA", { email: "adminD@test.com" });

    const tokenA = await login("adminC@test.com");
    const tokenB = await login("adminD@test.com");

    const salon = await request(app)
      .post("/api/salones")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ nombre: "Salón privado de A", capacidad: 10 });

    const editar = await request(app)
      .put(`/api/salones/${salon.body.id}`)
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ nombre: "Intento de robo" });
    expect(editar.status).toBe(404);

    const borrar = await request(app).delete(`/api/salones/${salon.body.id}`).set("Authorization", `Bearer ${tokenB}`);
    expect(borrar.status).toBe(404);
  });

  test("sin token no se puede acceder a rutas protegidas (401)", async () => {
    const res = await request(app).get("/api/salones");
    expect(res.status).toBe(401);
  });
});
