const request = require("supertest");
const app = require("../src/app");
const { limpiarBD, prisma } = require("./helpers/db");
const { crearAcademia, crearUsuario } = require("./helpers/fixtures");
const { login } = require("./helpers/auth");
const { VERSION_POLITICA_DATOS } = require("../src/utils/privacidad");

beforeEach(async () => {
  await limpiarBD();
});

afterAll(async () => {
  await prisma.$disconnect();
});

const academiaNueva = {
  academia: { nombre: "Academia Privacidad", nit: "901234567-1" },
  admin: { nombre: "Admin Privacidad", email: "admin@privacidad.test", password: "Prueba123!" },
};

// Ley 1581 de 2012: cada cuenta debe tener constancia de la autorización
// para tratar los datos de la persona (DOC-08, sección 5).
describe("Ley 1581 · autorización de tratamiento de datos", () => {
  test("CP-091 · no registra la academia si el administrador no acepta la política (400)", async () => {
    const sinAceptar = await request(app).post("/api/auth/onboarding").send(academiaNueva);
    const conTexto = await request(app).post("/api/auth/onboarding").send({ ...academiaNueva, aceptaPoliticaDatos: "si" });

    expect(sinAceptar.status).toBe(400);
    expect(conTexto.status).toBe(400);
    expect(await prisma.tenant.count()).toBe(0);
  });

  test("CP-092 · al registrar la academia guarda la fecha y la versión de la política aceptada por el administrador", async () => {
    const antes = new Date();
    const res = await request(app).post("/api/auth/onboarding").send({ ...academiaNueva, aceptaPoliticaDatos: true });

    expect(res.status).toBe(201);
    const admin = await prisma.user.findUnique({ where: { email: "admin@privacidad.test" } });
    expect(admin.versionPoliticaDatos).toBe(VERSION_POLITICA_DATOS);
    expect(admin.autorizacionDatosEn.getTime()).toBeGreaterThanOrEqual(antes.getTime() - 1000);
  });

  test("CP-093 · el admin no puede crear un estudiante sin confirmar la autorización de datos (400)", async () => {
    const academia = await crearAcademia();
    await crearUsuario(academia.id, "ADMIN_ACADEMIA", { email: "admin@datos.test" });
    const token = await login("admin@datos.test");

    const res = await request(app)
      .post("/api/usuarios")
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "Estudiante Menor", email: "menor@datos.test", password: "Prueba123!", rol: "ESTUDIANTE" });

    expect(res.status).toBe(400);
    expect(await prisma.user.findUnique({ where: { email: "menor@datos.test" } })).toBeNull();
  });

  test("CP-094 · con la autorización confirmada crea el usuario y guarda la fecha y la versión", async () => {
    const academia = await crearAcademia();
    await crearUsuario(academia.id, "ADMIN_ACADEMIA", { email: "admin2@datos.test" });
    const token = await login("admin2@datos.test");

    const res = await request(app)
      .post("/api/usuarios")
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "Profe Datos", email: "profe@datos.test", password: "Prueba123!", rol: "PROFESOR", autorizacionDatos: true });

    expect(res.status).toBe(201);
    const creado = await prisma.user.findUnique({ where: { email: "profe@datos.test" } });
    expect(creado.versionPoliticaDatos).toBe(VERSION_POLITICA_DATOS);
    expect(creado.autorizacionDatosEn).toBeInstanceOf(Date);
  });
});
