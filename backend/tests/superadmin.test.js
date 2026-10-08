const request = require("supertest");
const app = require("../src/app");
const { limpiarBD, prisma } = require("./helpers/db");
const { crearAcademia, crearUsuario } = require("./helpers/fixtures");
const { login } = require("./helpers/auth");

let tokenSuper;
let tokenAdminAcademia;
let academia;

beforeEach(async () => {
  await limpiarBD();
  await crearUsuario(null, "SUPERADMIN", { email: "super@test.com" });
  academia = await crearAcademia();
  await crearUsuario(academia.id, "ADMIN_ACADEMIA", { email: "admin@super.test" });
  tokenSuper = await login("super@test.com");
  tokenAdminAcademia = await login("admin@super.test");
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("RF-02 y RF-03 · HU-02 y HU-03: panel del SuperAdministrador", () => {
  test("CP-012 · lista las academias registradas", async () => {
    const res = await request(app).get("/api/superadmin/tenants").set("Authorization", `Bearer ${tokenSuper}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  test("CP-013 · suspender una academia bloquea el login de sus usuarios", async () => {
    const suspender = await request(app)
      .patch(`/api/superadmin/tenants/${academia.id}/estado`)
      .set("Authorization", `Bearer ${tokenSuper}`)
      .send({ estado: "SUSPENDIDA" });
    expect(suspender.status).toBe(200);

    const loginRes = await request(app).post("/api/auth/login").send({ email: "admin@super.test", password: "Prueba123!" });
    expect(loginRes.status).toBe(401);
  });

  test("CP-014 · un ADMIN_ACADEMIA no puede usar las rutas de SuperAdmin (403)", async () => {
    const res = await request(app).get("/api/superadmin/tenants").set("Authorization", `Bearer ${tokenAdminAcademia}`);
    expect(res.status).toBe(403);
  });
});

describe("RF-03 · HU-03: desactivar una academia sin borrar sus datos (RN-06)", () => {
  function cambiarEstado(estado) {
    return request(app)
      .patch(`/api/superadmin/tenants/${academia.id}/estado`)
      .set("Authorization", `Bearer ${tokenSuper}`)
      .send({ estado });
  }

  test("CP-079 · avisa si la academia ya estaba desactivada (HU-03-CA-02)", async () => {
    expect((await cambiarEstado("SUSPENDIDA")).status).toBe(200);

    const otraVez = await cambiarEstado("SUSPENDIDA");
    expect(otraVez.status).toBe(409);
    expect(otraVez.body.error).toMatch(/ya está desactivada/);
  });

  test("CP-080 · al reactivarla conserva sus datos y sus usuarios vuelven a entrar (HU-03-CA-03)", async () => {
    await cambiarEstado("SUSPENDIDA");
    expect((await cambiarEstado("ACTIVA")).status).toBe(200);

    expect(await prisma.user.count({ where: { tenantId: academia.id } })).toBe(1);
    expect(await login("admin@super.test")).toBeDefined();
  });
});
