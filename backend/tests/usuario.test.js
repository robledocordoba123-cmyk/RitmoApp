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

// El admin es quien da de alta a profesores y estudiantes de su academia;
// no existe autorregistro público para estos dos roles.
describe("POST /api/usuarios: el admin crea profesores y estudiantes", () => {
  test("crea un profesor en la academia del admin", async () => {
    const academia = await crearAcademia();
    await crearUsuario(academia.id, "ADMIN_ACADEMIA", { email: "admin3@usuarios.test" });
    const token = await login("admin3@usuarios.test");

    const res = await request(app)
      .post("/api/usuarios")
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "Profe Nuevo", email: "profenuevo@usuarios.test", password: "Prueba123!", rol: "PROFESOR" });

    expect(res.status).toBe(201);
    expect(res.body.rol).toBe("PROFESOR");
    expect(res.body.passwordHash).toBeUndefined();

    const creado = await prisma.user.findUnique({ where: { email: "profenuevo@usuarios.test" } });
    expect(creado.tenantId).toBe(academia.id);
  });

  test("rechaza un correo ya usado (409)", async () => {
    const academia = await crearAcademia();
    await crearUsuario(academia.id, "ADMIN_ACADEMIA", { email: "admin4@usuarios.test" });
    await crearUsuario(academia.id, "ESTUDIANTE", { email: "repetido2@usuarios.test" });
    const token = await login("admin4@usuarios.test");

    const res = await request(app)
      .post("/api/usuarios")
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "Otro", email: "repetido2@usuarios.test", password: "Prueba123!", rol: "ESTUDIANTE" });

    expect(res.status).toBe(409);
  });

  test("rechaza crear un rol no permitido, como ADMIN_ACADEMIA (400)", async () => {
    const academia = await crearAcademia();
    await crearUsuario(academia.id, "ADMIN_ACADEMIA", { email: "admin5@usuarios.test" });
    const token = await login("admin5@usuarios.test");

    const res = await request(app)
      .post("/api/usuarios")
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "Intento", email: "intento@usuarios.test", password: "Prueba123!", rol: "ADMIN_ACADEMIA" });

    expect(res.status).toBe(400);
  });

  test("un profesor no puede crear usuarios (403)", async () => {
    const academia = await crearAcademia();
    await crearUsuario(academia.id, "PROFESOR", { email: "profe6@usuarios.test" });
    const token = await login("profe6@usuarios.test");

    const res = await request(app)
      .post("/api/usuarios")
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "X", email: "x@usuarios.test", password: "Prueba123!", rol: "ESTUDIANTE" });

    expect(res.status).toBe(403);
  });
});
