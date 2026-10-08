const request = require("supertest");
const app = require("../src/app");
const correo = require("../src/utils/correo");
const { limpiarBD, prisma } = require("./helpers/db");
const { crearAcademia, crearUsuario, PASSWORD_PLANA } = require("./helpers/fixtures");

const EMAIL = "olvido@recuperar.test";
const NUEVA = "OtraClave2026!";

let envio;

beforeEach(async () => {
  await limpiarBD();
  const tenant = await crearAcademia();
  await crearUsuario(tenant.id, "ESTUDIANTE", { email: EMAIL, nombre: "Ana" });
  // No se manda ningún correo real: se captura el que se habría enviado.
  envio = jest.spyOn(correo, "enviarCorreo").mockResolvedValue();
});

afterEach(() => {
  envio.mockRestore();
});

afterAll(async () => {
  await prisma.$disconnect();
});

function solicitar(email) {
  return request(app).post("/api/auth/recuperar").send({ email });
}

function restablecer(token, password = NUEVA) {
  return request(app).post("/api/auth/restablecer").send({ token, password });
}

function login(password) {
  return request(app).post("/api/auth/login").send({ email: EMAIL, password });
}

// Saca el token del enlace del último correo "enviado".
function tokenDelCorreo() {
  const { texto } = envio.mock.calls.at(-1)[0];
  return texto.match(/token=([a-f0-9]+)/)[1];
}

describe("RF-05 · HU-05: recuperar contraseña (RN-07)", () => {
  test("CP-066 · envía al correo un enlace con token y solo guarda su hash", async () => {
    const res = await solicitar("Olvido@Recuperar.test");

    expect(res.status).toBe(200);
    expect(envio).toHaveBeenCalledTimes(1);
    expect(envio.mock.calls[0][0].para).toBe(EMAIL);

    const token = tokenDelCorreo();
    const guardado = await prisma.tokenRecuperacion.findFirst();
    expect(guardado.tokenHash).not.toBe(token);
    const minutos = (guardado.expiraEn.getTime() - Date.now()) / 60000;
    expect(minutos).toBeGreaterThan(29);
    expect(minutos).toBeLessThanOrEqual(30);
  });

  test("CP-067 · con un correo que no existe responde igual y no envía nada", async () => {
    const existe = await solicitar(EMAIL);
    const noExiste = await solicitar("nadie@recuperar.test");

    expect(noExiste.status).toBe(200);
    expect(noExiste.body).toEqual(existe.body);
    expect(envio).toHaveBeenCalledTimes(1);
  });

  test("CP-068 · con el enlace válido cambia la contraseña: entra con la nueva y no con la anterior", async () => {
    await solicitar(EMAIL);

    const res = await restablecer(tokenDelCorreo());
    expect(res.status).toBe(200);
    expect((await login(NUEVA)).status).toBe(200);
    expect((await login(PASSWORD_PLANA)).status).toBe(401);
  });

  test("CP-069 · rechaza un enlace vencido y pide uno nuevo (HU-05-CA-02)", async () => {
    await solicitar(EMAIL);
    await prisma.tokenRecuperacion.updateMany({ data: { expiraEn: new Date(Date.now() - 1000) } });

    const res = await restablecer(tokenDelCorreo());
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/solicita uno nuevo/i);
    expect((await login(PASSWORD_PLANA)).status).toBe(200);
  });

  test("CP-070 · el enlace sirve una sola vez, aunque lleguen dos intentos a la vez", async () => {
    await solicitar(EMAIL);
    const token = tokenDelCorreo();

    const codigos = (await Promise.all([restablecer(token, NUEVA), restablecer(token, "TerceraClave99")])).map((r) => r.status).sort();
    expect(codigos).toEqual([200, 400]);
    expect((await restablecer(token)).status).toBe(400);
  });

  test("CP-071 · exige el mínimo de seguridad y el enlace sigue sirviendo (HU-05-CA-03)", async () => {
    await solicitar(EMAIL);
    const token = tokenDelCorreo();

    expect((await restablecer(token, "corta")).status).toBe(400);
    expect((await restablecer(token, NUEVA)).status).toBe(200);
  });

  test("CP-072 · pedir un enlace nuevo anula el anterior", async () => {
    await solicitar(EMAIL);
    const viejo = tokenDelCorreo();
    await solicitar(EMAIL);
    const nuevo = tokenDelCorreo();

    expect((await restablecer(viejo)).status).toBe(400);
    expect((await restablecer(nuevo)).status).toBe(200);
  });
});
