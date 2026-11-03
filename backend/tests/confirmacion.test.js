const request = require("supertest");
const app = require("../src/app");
const correo = require("../src/utils/correo");
const { hashDe } = require("../src/utils/enlaces");
const { limpiarBD, prisma } = require("./helpers/db");
const { crearAcademia, crearUsuario } = require("./helpers/fixtures");

const EMAIL = "nueva@confirmar.test";
const PASSWORD = "Prueba123!";

let envio;

beforeEach(async () => {
  await limpiarBD();
  // No se manda ningún correo real: se captura el que se habría enviado.
  envio = jest.spyOn(correo, "enviarCorreo").mockResolvedValue();
});

afterEach(() => {
  envio.mockRestore();
});

afterAll(async () => {
  await prisma.$disconnect();
});

function registrar(email = EMAIL) {
  return request(app)
    .post("/api/auth/onboarding")
    .send({
      academia: { nombre: "Academia Confirmar", nit: `NIT-${Math.random()}` },
      admin: { nombre: "Laura", email, password: PASSWORD },
      aceptaPoliticaDatos: true,
    });
}

function login(email = EMAIL) {
  return request(app).post("/api/auth/login").send({ email, password: PASSWORD });
}

function confirmar(token) {
  return request(app).post("/api/auth/confirmar").send({ token });
}

function reenviar(email) {
  return request(app).post("/api/auth/reenviar-confirmacion").send({ email });
}

// Saca el token del enlace del último correo "enviado".
function tokenDelCorreo() {
  const { texto } = envio.mock.calls.at(-1)[0];
  return texto.match(/confirmar-cuenta\?token=([a-f0-9]+)/)[1];
}

describe("RF-06 · HU-06: confirmar la cuenta por correo", () => {
  test("CP-196 · al registrar la academia envía el enlace de confirmación y solo guarda su hash (HU-06-CA-01)", async () => {
    const res = await registrar();

    expect(res.status).toBe(201);
    expect(envio).toHaveBeenCalledTimes(1);
    const { para, asunto, html } = envio.mock.calls[0][0];
    expect(para).toBe(EMAIL);
    expect(asunto).toMatch(/confirma/i);
    expect(html).toContain("Laura");

    const token = tokenDelCorreo();
    const guardado = await prisma.tokenConfirmacion.findFirst();
    expect(guardado.tokenHash).toBe(hashDe(token));
    expect(guardado.tokenHash).not.toBe(token);
  });

  test("CP-197 · sin confirmar no puede iniciar sesión y la API le dice que confirme (HU-06-CA-02)", async () => {
    await registrar();

    const res = await login();

    expect(res.status).toBe(403);
    expect(res.body.codigo).toBe("CORREO_SIN_CONFIRMAR");
    expect(res.body.token).toBeUndefined();
  });

  test("CP-198 · con la contraseña equivocada responde 401 y no revela que la cuenta está sin confirmar", async () => {
    await registrar();

    const res = await request(app).post("/api/auth/login").send({ email: EMAIL, password: "OtraClave99!" });

    expect(res.status).toBe(401);
    expect(res.body.codigo).toBeUndefined();
  });

  test("CP-199 · al abrir el enlace la cuenta queda activa y ya puede iniciar sesión (HU-06-CA-01)", async () => {
    await registrar();

    const res = await confirmar(tokenDelCorreo());

    expect(res.status).toBe(200);
    const admin = await prisma.user.findUnique({ where: { email: EMAIL } });
    expect(admin.confirmacionPendiente).toBe(false);
    expect(admin.correoConfirmadoEn).toBeInstanceOf(Date);
    const entrada = await login();
    expect(entrada.status).toBe(200);
    expect(entrada.body.usuario.rol).toBe("ADMIN_ACADEMIA");
  });

  test("CP-200 · el enlace sirve una sola vez", async () => {
    await registrar();
    const token = tokenDelCorreo();

    const primera = await confirmar(token);
    const segunda = await confirmar(token);

    expect(primera.status).toBe(200);
    expect(segunda.status).toBe(400);
  });

  test("CP-201 · un enlace vencido no confirma la cuenta (HU-06-CA-03)", async () => {
    await registrar();
    const token = tokenDelCorreo();
    await prisma.tokenConfirmacion.updateMany({ data: { expiraEn: new Date(Date.now() - 1000) } });

    const res = await confirmar(token);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/venció/);
    const admin = await prisma.user.findUnique({ where: { email: EMAIL } });
    expect(admin.confirmacionPendiente).toBe(true);
  });

  test("CP-202 · pedir otro enlace manda uno nuevo y anula el anterior (HU-06-CA-03)", async () => {
    await registrar();
    const viejo = tokenDelCorreo();

    const res = await reenviar("  Nueva@Confirmar.TEST ");
    const nuevo = tokenDelCorreo();

    expect(res.status).toBe(200);
    expect(envio).toHaveBeenCalledTimes(2);
    expect(nuevo).not.toBe(viejo);
    expect((await confirmar(viejo)).status).toBe(400);
    expect((await confirmar(nuevo)).status).toBe(200);
  });

  test("CP-203 · el reenvío responde igual exista o no la cuenta, y no manda nada si no hay nada que confirmar", async () => {
    const academia = await crearAcademia();
    await crearUsuario(academia.id, "ESTUDIANTE", { email: "yaactiva@confirmar.test" });

    const noExiste = await reenviar("nadie@confirmar.test");
    const yaActiva = await reenviar("yaactiva@confirmar.test");

    expect(noExiste.status).toBe(200);
    expect(yaActiva.status).toBe(200);
    expect(yaActiva.body).toEqual(noExiste.body);
    expect(envio).not.toHaveBeenCalled();
  });

  test("CP-204 · los usuarios que crea el administrador no necesitan confirmar el correo", async () => {
    const academia = await crearAcademia();
    await crearUsuario(academia.id, "ADMIN_ACADEMIA", { email: "admin@yaexiste.test" });
    const sesion = await request(app).post("/api/auth/login").send({ email: "admin@yaexiste.test", password: PASSWORD });

    const creado = await request(app)
      .post("/api/usuarios")
      .set("Authorization", `Bearer ${sesion.body.token}`)
      .send({ nombre: "Profe", email: "profe@yaexiste.test", password: PASSWORD, rol: "PROFESOR", autorizacionDatos: true });

    expect(creado.status).toBe(201);
    expect((await login("profe@yaexiste.test")).status).toBe(200);
  });

  test("CP-205 · rechaza la confirmación sin token (400)", async () => {
    const res = await confirmar(undefined);
    expect(res.status).toBe(400);
  });
});
