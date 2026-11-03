const request = require("supertest");
const app = require("../src/app");
const { limpiarBD, prisma } = require("./helpers/db");
const { crearAcademia, crearUsuario } = require("./helpers/fixtures");
const { login } = require("./helpers/auth");

// PNG real de 1x1 píxel: sus primeros bytes son la firma de un PNG.
const FOTO_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

beforeEach(async () => {
  await limpiarBD();
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function estudianteConSesion() {
  const academia = await crearAcademia();
  const usuario = await crearUsuario(academia.id, "ESTUDIANTE", { email: "ana@perfil.test", nombre: "Ana" });
  const token = await login("ana@perfil.test");
  return { academia, usuario, token };
}

describe("RF-07 · HU-07: editar el perfil propio", () => {
  test("CP-210 · cualquier usuario ve su perfil, sin la contraseña", async () => {
    const { token } = await estudianteConSesion();

    const res = await request(app).get("/api/perfil").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ nombre: "Ana", email: "ana@perfil.test", rol: "ESTUDIANTE", fotoPerfil: null });
    expect(res.body.passwordHash).toBeUndefined();
  });

  test("CP-211 · HU-07-CA-01: actualiza nombre y foto y los cambios se ven de inmediato", async () => {
    const { usuario, token } = await estudianteConSesion();

    const res = await request(app)
      .patch("/api/perfil")
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "  Ana María  ", fotoPerfil: FOTO_PNG });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ nombre: "Ana María", fotoPerfil: FOTO_PNG });

    const guardado = await prisma.user.findUnique({ where: { id: usuario.id } });
    expect(guardado.nombre).toBe("Ana María");
    expect(guardado.fotoPerfil).toBe(FOTO_PNG);

    // El login siguiente ya trae la foto para mostrarla en el menú.
    const sesion = await request(app).post("/api/auth/login").send({ email: "ana@perfil.test", password: "Prueba123!" });
    expect(sesion.body.usuario.fotoPerfil).toBe(FOTO_PNG);
  });

  test("CP-212 · HU-07-CA-02: rechaza un formato no permitido y explica los válidos", async () => {
    const { usuario, token } = await estudianteConSesion();
    const gif = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";

    const res = await request(app).patch("/api/perfil").set("Authorization", `Bearer ${token}`).send({ fotoPerfil: gif });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/JPG, PNG o WebP/);
    const guardado = await prisma.user.findUnique({ where: { id: usuario.id } });
    expect(guardado.fotoPerfil).toBeNull();
  });

  test("CP-213 · HU-07-CA-02: rechaza un archivo que dice ser PNG pero no lo es", async () => {
    const { token } = await estudianteConSesion();
    const falso = `data:image/png;base64,${Buffer.from("esto no es una imagen de verdad").toString("base64")}`;

    const res = await request(app).patch("/api/perfil").set("Authorization", `Bearer ${token}`).send({ fotoPerfil: falso });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/JPG, PNG o WebP/);
  });

  test("CP-214 · HU-07-CA-03: el correo no se puede cambiar desde el perfil", async () => {
    const { usuario, token } = await estudianteConSesion();

    const res = await request(app)
      .patch("/api/perfil")
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "Ana", email: "otro@perfil.test" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/correo no se puede cambiar/);
    const guardado = await prisma.user.findUnique({ where: { id: usuario.id } });
    expect(guardado.email).toBe("ana@perfil.test");
  });

  test("CP-215 · rechaza un nombre vacío y una petición sin cambios", async () => {
    const { token } = await estudianteConSesion();

    const vacio = await request(app).patch("/api/perfil").set("Authorization", `Bearer ${token}`).send({ nombre: "   " });
    expect(vacio.status).toBe(400);

    const sinCambios = await request(app).patch("/api/perfil").set("Authorization", `Bearer ${token}`).send({});
    expect(sinCambios.status).toBe(400);
  });

  test("CP-216 · quitar la foto (null) la borra", async () => {
    const { usuario, token } = await estudianteConSesion();
    await prisma.user.update({ where: { id: usuario.id }, data: { fotoPerfil: FOTO_PNG } });

    const res = await request(app).patch("/api/perfil").set("Authorization", `Bearer ${token}`).send({ fotoPerfil: null });

    expect(res.status).toBe(200);
    expect(res.body.fotoPerfil).toBeNull();
  });

  test("CP-217 · sin sesión no hay acceso y el cambio queda en la bitácora sin la foto", async () => {
    const sinToken = await request(app).get("/api/perfil");
    expect(sinToken.status).toBe(401);

    const { academia, usuario, token } = await estudianteConSesion();
    await request(app).patch("/api/perfil").set("Authorization", `Bearer ${token}`).send({ nombre: "Ana", fotoPerfil: FOTO_PNG });

    const registros = await prisma.bitacora.findMany({ where: { tenantId: academia.id } });
    expect(registros).toHaveLength(1);
    expect(registros[0]).toMatchObject({ usuarioId: usuario.id, accion: "Editó su perfil", detalle: "Ana" });
  });
});
