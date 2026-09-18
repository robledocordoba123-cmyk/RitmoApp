const request = require("supertest");
const app = require("../src/app");
const { limpiarBD, prisma } = require("./helpers/db");
const { crearAcademia, crearUsuario } = require("./helpers/fixtures");

beforeEach(async () => {
  await limpiarBD();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("RF-01: onboarding de academia", () => {
  test("registra una academia nueva con su administrador y devuelve token", async () => {
    const res = await request(app)
      .post("/api/auth/onboarding")
      .send({
        academia: { nombre: "Academia Nueva", nit: "900111222-1" },
        admin: { nombre: "Admin Nuevo", email: "admin@academianueva.test", password: "Prueba123!" },
      });

    expect(res.status).toBe(201);
    expect(res.body.tenant.nit).toBe("900111222-1");
    expect(res.body.token).toBeDefined();
    // El frontend guarda esto en la sesión; debe traer lo mismo que /login.
    expect(res.body.usuario).toMatchObject({ nombre: "Admin Nuevo", rol: "ADMIN_ACADEMIA", tenantId: res.body.tenant.id });

    const usuarioCreado = await prisma.user.findUnique({ where: { email: "admin@academianueva.test" } });
    expect(usuarioCreado.rol).toBe("ADMIN_ACADEMIA");
  });

  test("rechaza un NIT ya registrado (409)", async () => {
    await crearAcademia({ nit: "900333444-1" });

    const res = await request(app)
      .post("/api/auth/onboarding")
      .send({
        academia: { nombre: "Otra academia", nit: "900333444-1" },
        admin: { nombre: "Otro Admin", email: "otro@test.com", password: "Prueba123!" },
      });

    expect(res.status).toBe(409);
  });

  test("rechaza un correo de administrador ya registrado (409)", async () => {
    const academia = await crearAcademia();
    await crearUsuario(academia.id, "ADMIN_ACADEMIA", { email: "repetido@test.com" });

    const res = await request(app)
      .post("/api/auth/onboarding")
      .send({
        academia: { nombre: "Academia Nueva 2", nit: "900555666-1" },
        admin: { nombre: "Admin", email: "repetido@test.com", password: "Prueba123!" },
      });

    expect(res.status).toBe(409);
  });

  test("rechaza la solicitud si faltan datos (400)", async () => {
    const res = await request(app).post("/api/auth/onboarding").send({ academia: { nombre: "X" } });
    expect(res.status).toBe(400);
  });
});

describe("RF-02: login", () => {
  test("con credenciales correctas devuelve token con rol y tenantId", async () => {
    const academia = await crearAcademia();
    await crearUsuario(academia.id, "ADMIN_ACADEMIA", { email: "valido@test.com" });

    const res = await request(app).post("/api/auth/login").send({ email: "valido@test.com", password: "Prueba123!" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.usuario.rol).toBe("ADMIN_ACADEMIA");
    expect(res.body.usuario.tenantId).toBe(academia.id);
  });

  test("rechaza contraseña incorrecta (401)", async () => {
    const academia = await crearAcademia();
    await crearUsuario(academia.id, "ADMIN_ACADEMIA", { email: "valido2@test.com" });

    const res = await request(app).post("/api/auth/login").send({ email: "valido2@test.com", password: "incorrecta" });
    expect(res.status).toBe(401);
  });

  test("rechaza un correo que no existe (401)", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "nadie@test.com", password: "Prueba123!" });
    expect(res.status).toBe(401);
  });

  test("rechaza el login si la academia está suspendida (401)", async () => {
    const academia = await crearAcademia({ estado: "SUSPENDIDA" });
    await crearUsuario(academia.id, "ADMIN_ACADEMIA", { email: "suspendida@test.com" });

    const res = await request(app).post("/api/auth/login").send({ email: "suspendida@test.com", password: "Prueba123!" });
    expect(res.status).toBe(401);
  });
});
