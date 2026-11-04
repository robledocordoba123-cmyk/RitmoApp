const request = require("supertest");
const app = require("../src/app");
const correo = require("../src/utils/correo");
const { VERSION_POLITICA_DATOS } = require("../src/utils/privacidad");
const { limpiarBD, prisma } = require("./helpers/db");
const { crearAcademia, crearUsuario, crearSalon, crearRitmo } = require("./helpers/fixtures");
const { login } = require("./helpers/auth");

const PASSWORD = "Prueba123!";
const UN_DIA = 24 * 60 * 60 * 1000;
const CODIGO_INVALIDO = /no es válido o ya venció/;

let tenant;
let tokenAdmin;
let envio;

beforeEach(async () => {
  await limpiarBD();
  envio = jest.spyOn(correo, "enviarCorreo").mockResolvedValue();
  tenant = await crearAcademia({ nombre: "Academia Son Caleño" });
  const admin = await crearUsuario(tenant.id, "ADMIN_ACADEMIA");
  tokenAdmin = await login(admin.email);
});

afterEach(() => {
  envio.mockRestore();
});

afterAll(async () => {
  await prisma.$disconnect();
});

function comoAdmin(metodo, ruta, token = tokenAdmin) {
  return request(app)[metodo](ruta).set("Authorization", `Bearer ${token}`);
}

async function generarCodigo() {
  const res = await comoAdmin("post", "/api/invitacion");
  return res.body.codigo;
}

function registrar(datos) {
  return request(app)
    .post("/api/auth/registro-estudiante")
    .send({ nombre: "Sara Ríos", email: "sara@estudiante.test", password: PASSWORD, aceptaPoliticaDatos: true, ...datos });
}

function tokenDelCorreo() {
  const { texto } = envio.mock.calls.at(-1)[0];
  return texto.match(/confirmar-cuenta\?token=([a-f0-9]+)/)[1];
}

describe("HU-22: código de invitación de la academia", () => {
  test("CP-221 · el administrador genera un código de 8 caracteres que vence en 30 días y queda en la bitácora sin el código", async () => {
    const res = await comoAdmin("post", "/api/invitacion");

    expect(res.status).toBe(201);
    expect(res.body.codigo).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    expect(res.body.vigente).toBe(true);
    const dias = (new Date(res.body.venceEn) - Date.now()) / UN_DIA;
    expect(dias).toBeGreaterThan(29.9);
    expect(dias).toBeLessThanOrEqual(30);

    const consulta = await comoAdmin("get", "/api/invitacion");
    expect(consulta.body.codigo).toBe(res.body.codigo);

    const registro = await prisma.bitacora.findFirst({ where: { tenantId: tenant.id } });
    expect(registro.accion).toBe("Generó un código de invitación");
    expect(JSON.stringify(registro)).not.toContain(res.body.codigo);
  });

  test("CP-222 · solo el administrador ve y cambia el código; sin sesión no hay acceso", async () => {
    const profesor = await crearUsuario(tenant.id, "PROFESOR");
    const estudiante = await crearUsuario(tenant.id, "ESTUDIANTE");
    for (const usuario of [profesor, estudiante]) {
      const token = await login(usuario.email);
      expect((await comoAdmin("get", "/api/invitacion", token)).status).toBe(403);
      expect((await comoAdmin("post", "/api/invitacion", token)).status).toBe(403);
    }
    expect((await request(app).post("/api/invitacion")).status).toBe(401);
  });

  test("CP-223 · generar otro código o desactivarlo deja sin servir el anterior", async () => {
    const primero = await generarCodigo();
    const segundo = await generarCodigo();
    expect(segundo).not.toBe(primero);
    expect((await registrar({ codigo: primero })).status).toBe(400);

    const apagado = await comoAdmin("delete", "/api/invitacion");
    expect(apagado.status).toBe(200);
    expect(apagado.body).toEqual({ codigo: null, venceEn: null, vigente: false });
    expect((await registrar({ codigo: segundo })).status).toBe(400);
  });
});

describe("HU-22: registrarse como estudiante con el código", () => {
  test("CP-224 · HU-22-CA-01: crea la cuenta solo como estudiante de esa academia, con la política aceptada y pendiente de confirmar", async () => {
    const codigo = await generarCodigo();
    const res = await registrar({ codigo, rol: "ADMIN_ACADEMIA" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ academia: "Academia Son Caleño", confirmacionPendiente: true, email: "sara@estudiante.test" });
    expect(res.body.token).toBeUndefined();
    const usuario = await prisma.user.findUnique({ where: { email: "sara@estudiante.test" } });
    expect(usuario).toMatchObject({ tenantId: tenant.id, rol: "ESTUDIANTE", confirmacionPendiente: true, versionPoliticaDatos: VERSION_POLITICA_DATOS });
    expect(usuario.autorizacionDatosEn).toBeInstanceOf(Date);
    expect(envio).toHaveBeenCalledTimes(1);
    expect(envio.mock.calls[0][0].para).toBe("sara@estudiante.test");
  });

  test("CP-225 · consultar el código muestra la academia y acepta minúsculas, espacios y guiones", async () => {
    const codigo = await generarCodigo();
    const escrito = `${codigo.slice(0, 4).toLowerCase()}- ${codigo.slice(4)}`;

    const res = await request(app).get(`/api/auth/invitacion/${encodeURIComponent(escrito)}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ academia: "Academia Son Caleño" });
    expect((await registrar({ codigo: escrito })).status).toBe(201);

    const malo = await request(app).get("/api/auth/invitacion/ZZZZ2222");
    expect(malo.status).toBe(404);
    expect(malo.body.error).toMatch(CODIGO_INVALIDO);
  });

  test("CP-226 · HU-22-CA-02: un código inexistente, vencido o de una academia suspendida se rechaza con el mismo mensaje y no crea nada", async () => {
    const codigo = await generarCodigo();
    const inexistente = await registrar({ codigo: "ABCD2345" });

    await prisma.tenant.update({ where: { id: tenant.id }, data: { codigoInvitacionVenceEn: new Date(Date.now() - 1000) } });
    const vencido = await registrar({ codigo });

    await prisma.tenant.update({ where: { id: tenant.id }, data: { codigoInvitacionVenceEn: new Date(Date.now() + UN_DIA), estado: "SUSPENDIDA" } });
    const suspendida = await registrar({ codigo });

    for (const res of [inexistente, vencido, suspendida]) {
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(CODIGO_INVALIDO);
      expect(res.body.error).toMatch(/Pide uno nuevo a tu academia/);
    }
    expect(await prisma.user.count({ where: { email: "sara@estudiante.test" } })).toBe(0);
    expect(envio).not.toHaveBeenCalled();
  });

  test("CP-227 · HU-22-CA-03: sin aceptar la política no se registra, y si es menor de edad necesita la autorización de su representante", async () => {
    const codigo = await generarCodigo();
    expect((await registrar({ codigo, aceptaPoliticaDatos: false })).status).toBe(400);

    const menorSola = await registrar({ codigo, menorDeEdad: true });
    expect(menorSola.status).toBe(400);
    expect(menorSola.body.error).toMatch(/representante legal/);

    const menorAutorizada = await registrar({ codigo, menorDeEdad: true, autorizaRepresentante: true });
    expect(menorAutorizada.status).toBe(201);
  });

  test("CP-228 · HU-22-CA-03: después de confirmar el correo entra a su academia, pero sin pagos no puede reservar (RN-05)", async () => {
    const codigo = await generarCodigo();
    await registrar({ codigo });

    expect((await request(app).post("/api/auth/login").send({ email: "sara@estudiante.test", password: PASSWORD })).status).toBe(403);
    expect((await request(app).post("/api/auth/confirmar").send({ token: tokenDelCorreo() })).status).toBe(200);
    const entrada = await request(app).post("/api/auth/login").send({ email: "sara@estudiante.test", password: PASSWORD });
    expect(entrada.status).toBe(200);
    expect(entrada.body.usuario).toMatchObject({ rol: "ESTUDIANTE", tenantId: tenant.id });

    const profesor = await crearUsuario(tenant.id, "PROFESOR");
    const salon = await crearSalon(tenant.id);
    const ritmo = await crearRitmo(tenant.id);
    const inicio = new Date(Date.now() + 7 * UN_DIA);
    const clase = await prisma.clase.create({
      data: {
        tenantId: tenant.id, ritmoId: ritmo.id, salonId: salon.id, profesorId: profesor.id,
        cupoMaximo: 5, cuposDisponibles: 5, fechaHoraInicio: inicio, fechaHoraFin: new Date(inicio.getTime() + 60 * 60 * 1000),
      },
    });
    const reserva = await request(app).post("/api/reservas").set("Authorization", `Bearer ${entrada.body.token}`).send({ claseId: clase.id });
    expect(reserva.status).toBe(403);
    expect(reserva.body.codigo).toBe("MEMBRESIA_VENCIDA");
  });

  test("CP-229 · rechaza datos incompletos, una contraseña corta y un correo que ya tiene cuenta", async () => {
    const codigo = await generarCodigo();
    expect((await registrar({ codigo, nombre: "  " })).status).toBe(400);
    expect((await registrar({ codigo, password: "corta" })).status).toBe(400);
    expect((await registrar({ codigo: undefined })).status).toBe(400);

    await crearUsuario(tenant.id, "PROFESOR", { email: "sara@estudiante.test" });
    const repetido = await registrar({ codigo });
    expect(repetido.status).toBe(409);
  });
});
