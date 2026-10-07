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

describe("RF-01 · HU-01: registro de academia (onboarding)", () => {
  test("CP-001 · registra una academia nueva con su administrador y devuelve token", async () => {
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

  test("CP-002 · rechaza un NIT ya registrado (409)", async () => {
    await crearAcademia({ nit: "900333444-1" });

    const res = await request(app)
      .post("/api/auth/onboarding")
      .send({
        academia: { nombre: "Otra academia", nit: "900333444-1" },
        admin: { nombre: "Otro Admin", email: "otro@test.com", password: "Prueba123!" },
      });

    expect(res.status).toBe(409);
  });

  test("CP-003 · rechaza un correo de administrador ya registrado (409)", async () => {
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

  test("CP-004 · el correo no distingue mayúsculas: 'Repetido@Test.com' choca con 'repetido@test.com' (409)", async () => {
    const academia = await crearAcademia();
    await crearUsuario(academia.id, "ADMIN_ACADEMIA", { email: "repetido@test.com" });

    const res = await request(app)
      .post("/api/auth/onboarding")
      .send({
        academia: { nombre: "Academia Nueva 3", nit: "900777888-1" },
        admin: { nombre: "Admin", email: "  Repetido@Test.com ", password: "Prueba123!" },
      });

    expect(res.status).toBe(409);
  });

  test("CP-005 · rechaza una contraseña de menos de 8 caracteres (400)", async () => {
    const res = await request(app)
      .post("/api/auth/onboarding")
      .send({
        academia: { nombre: "Academia Corta", nit: "900999000-1" },
        admin: { nombre: "Admin", email: "corta@test.com", password: "123" },
      });

    expect(res.status).toBe(400);
  });

  test("CP-006 · rechaza la solicitud si faltan datos (400)", async () => {
    const res = await request(app).post("/api/auth/onboarding").send({ academia: { nombre: "X" } });
    expect(res.status).toBe(400);
  });
});

describe("RF-04 · HU-04: inicio de sesión", () => {
  test("CP-007 · con credenciales correctas devuelve token con rol y tenantId", async () => {
    const academia = await crearAcademia();
    await crearUsuario(academia.id, "ADMIN_ACADEMIA", { email: "valido@test.com" });

    const res = await request(app).post("/api/auth/login").send({ email: "valido@test.com", password: "Prueba123!" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.usuario.rol).toBe("ADMIN_ACADEMIA");
    expect(res.body.usuario.tenantId).toBe(academia.id);
  });

  test("CP-008 · acepta el correo escrito con mayúsculas o espacios", async () => {
    const academia = await crearAcademia();
    await crearUsuario(academia.id, "ESTUDIANTE", { email: "ana@test.com" });

    const res = await request(app).post("/api/auth/login").send({ email: " Ana@Test.com", password: "Prueba123!" });
    expect(res.status).toBe(200);
  });

  test("CP-009 · rechaza contraseña incorrecta (401)", async () => {
    const academia = await crearAcademia();
    await crearUsuario(academia.id, "ADMIN_ACADEMIA", { email: "valido2@test.com" });

    const res = await request(app).post("/api/auth/login").send({ email: "valido2@test.com", password: "incorrecta" });
    expect(res.status).toBe(401);
  });

  test("CP-010 · rechaza un correo que no existe (401)", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "nadie@test.com", password: "Prueba123!" });
    expect(res.status).toBe(401);
  });

  test("CP-011 · rechaza el login si la academia está suspendida (401)", async () => {
    const academia = await crearAcademia({ estado: "SUSPENDIDA" });
    await crearUsuario(academia.id, "ADMIN_ACADEMIA", { email: "suspendida@test.com" });

    const res = await request(app).post("/api/auth/login").send({ email: "suspendida@test.com", password: "Prueba123!" });
    expect(res.status).toBe(401);
  });
});
