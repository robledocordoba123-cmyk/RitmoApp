const request = require("supertest");
const app = require("../src/app");
const { limpiarBD, prisma } = require("./helpers/db");
const {
  crearAcademia,
  crearUsuario,
  crearSalon,
  crearRitmo,
  crearTarifa,
  darMembresia,
} = require("./helpers/fixtures");
const { login } = require("./helpers/auth");

const UN_DIA = 24 * 60 * 60 * 1000;

let tenant;
let admin;
let tokenAdmin;
let tarifa;

beforeEach(async () => {
  await limpiarBD();
  tenant = await crearAcademia();
  admin = await crearUsuario(tenant.id, "ADMIN_ACADEMIA", { email: "admin@pagos.test" });
  tokenAdmin = await login("admin@pagos.test");
  tarifa = await crearTarifa(tenant.id, { nombre: "Mensualidad", valor: 120000, duracionDias: 30 });
});

afterAll(async () => {
  await prisma.$disconnect();
});

function comoAdmin(metodo, url) {
  return request(app)[metodo](url).set("Authorization", `Bearer ${tokenAdmin}`);
}

function registrarPago(datos, token = tokenAdmin) {
  return request(app).post("/api/pagos").set("Authorization", `Bearer ${token}`).send(datos);
}

async function estudianteSinPagos(email) {
  const estudiante = await crearUsuario(tenant.id, "ESTUDIANTE", { email, membresia: false });
  return { estudiante, token: await login(email) };
}

describe("RF-18 · HU-18: tarifas de la academia (RN-13)", () => {
  test("CP-048 · el admin crea una tarifa y la ve en el listado", async () => {
    const res = await comoAdmin("post", "/api/tarifas").send({ nombre: "Tiquetera 8 clases", valor: 90000, duracionDias: 45 });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ nombre: "Tiquetera 8 clases", valor: 90000, duracionDias: 45, activa: true });

    const lista = await comoAdmin("get", "/api/tarifas");
    expect(lista.body.map((t) => t.nombre)).toEqual(expect.arrayContaining(["Mensualidad", "Tiquetera 8 clases"]));
  });

  test("CP-049 · rechaza una tarifa con valor o duración inválidos (400)", async () => {
    const sinValor = await comoAdmin("post", "/api/tarifas").send({ nombre: "Gratis", valor: 0, duracionDias: 30 });
    const sinDias = await comoAdmin("post", "/api/tarifas").send({ nombre: "Rara", valor: 1000, duracionDias: -1 });
    expect(sinValor.status).toBe(400);
    expect(sinDias.status).toBe(400);
  });

  test("CP-050 · editar una tarifa no cambia los pagos ya registrados (HU-18-CA-03)", async () => {
    const { estudiante } = await estudianteSinPagos("est@pagos.test");
    await registrarPago({ estudianteId: estudiante.id, tarifaId: tarifa.id, medio: "EFECTIVO" });

    const edicion = await comoAdmin("put", `/api/tarifas/${tarifa.id}`).send({ nombre: "Mensualidad 2027", valor: 150000 });
    expect(edicion.status).toBe(200);

    const pago = await prisma.pago.findFirst({ where: { estudianteId: estudiante.id } });
    expect(pago).toMatchObject({ nombreTarifa: "Mensualidad", monto: 120000 });
  });

  test("CP-051 · no deja eliminar una tarifa con pagos (409), pero sí una sin pagos (204)", async () => {
    const { estudiante } = await estudianteSinPagos("est@pagos.test");
    await registrarPago({ estudianteId: estudiante.id, tarifaId: tarifa.id, medio: "EFECTIVO" });
    const sinUso = await crearTarifa(tenant.id, { nombre: "Clase suelta", valor: 20000, duracionDias: 1 });

    expect((await comoAdmin("delete", `/api/tarifas/${tarifa.id}`)).status).toBe(409);
    expect((await comoAdmin("delete", `/api/tarifas/${sinUso.id}`)).status).toBe(204);
  });
});

describe("RF-19 · HU-19: registro de pagos (RN-05, RN-14)", () => {
  test("CP-052 · registra el pago, deja al estudiante al día y guarda quién lo registró", async () => {
    const { estudiante } = await estudianteSinPagos("est@pagos.test");

    const res = await registrarPago({ estudianteId: estudiante.id, tarifaId: tarifa.id, medio: "TRANSFERENCIA", referencia: "Nequi 4581" });
    expect(res.status).toBe(201);
    expect(res.body.pago).toMatchObject({ monto: 120000, nombreTarifa: "Mensualidad", referencia: "Nequi 4581", registradoPorId: admin.id });
    expect(res.body.membresia.estado).toBe("AL_DIA");
    expect(res.body.membresia.diasRestantes).toBe(30);
  });

  test("CP-053 · rechaza un monto cero o negativo (400, RN-14)", async () => {
    const { estudiante } = await estudianteSinPagos("est@pagos.test");

    for (const monto of [0, -5000, 1500.5]) {
      const res = await registrarPago({ estudianteId: estudiante.id, tarifaId: tarifa.id, medio: "EFECTIVO", monto });
      expect(res.status).toBe(400);
    }
    expect(await prisma.pago.count()).toBe(0);
  });

  test("CP-054 · rechaza tarifas desactivadas o de otra academia y estudiantes de otra academia", async () => {
    const { estudiante } = await estudianteSinPagos("est@pagos.test");
    const desactivada = await crearTarifa(tenant.id, { nombre: "Vieja", activa: false });
    const otraAcademia = await crearAcademia({ nombre: "Otra" });
    const tarifaAjena = await crearTarifa(otraAcademia.id);
    const estudianteAjeno = await crearUsuario(otraAcademia.id, "ESTUDIANTE", { membresia: false });

    expect((await registrarPago({ estudianteId: estudiante.id, tarifaId: desactivada.id, medio: "EFECTIVO" })).status).toBe(400);
    expect((await registrarPago({ estudianteId: estudiante.id, tarifaId: tarifaAjena.id, medio: "EFECTIVO" })).status).toBe(400);
    expect((await registrarPago({ estudianteId: estudianteAjeno.id, tarifaId: tarifa.id, medio: "EFECTIVO" })).status).toBe(404);
  });

  test("CP-055 · un pago adelantado extiende la membresía desde donde termina la actual", async () => {
    const { estudiante } = await estudianteSinPagos("est@pagos.test");
    const vigenteHasta = new Date(Date.now() + 10 * UN_DIA);
    await darMembresia(tenant.id, estudiante.id, { vigenteHasta });

    const res = await registrarPago({ estudianteId: estudiante.id, tarifaId: tarifa.id, medio: "EFECTIVO" });
    expect(new Date(res.body.pago.vigenteDesde).getTime()).toBe(vigenteHasta.getTime());
    expect(res.body.membresia.diasRestantes).toBe(40);
  });

  test("CP-056 · dos pagos registrados a la vez suman los dos periodos sin perder días", async () => {
    const { estudiante } = await estudianteSinPagos("est@pagos.test");
    const datos = { estudianteId: estudiante.id, tarifaId: tarifa.id, medio: "EFECTIVO" };

    const respuestas = await Promise.all([registrarPago(datos), registrarPago(datos)]);
    expect(respuestas.map((r) => r.status)).toEqual([201, 201]);

    const ultimo = await prisma.pago.findFirst({ where: { estudianteId: estudiante.id }, orderBy: { vigenteHasta: "desc" } });
    const dias = Math.round((ultimo.vigenteHasta.getTime() - Date.now()) / UN_DIA);
    expect(dias).toBe(60);
  });

  test("CP-057 · solo el admin registra pagos: profesor y estudiante reciben 403", async () => {
    const { estudiante, token: tokenEst } = await estudianteSinPagos("est@pagos.test");
    await crearUsuario(tenant.id, "PROFESOR", { email: "profe@pagos.test" });
    const tokenProfe = await login("profe@pagos.test");
    const datos = { estudianteId: estudiante.id, tarifaId: tarifa.id, medio: "EFECTIVO" };

    expect((await registrarPago(datos, tokenProfe)).status).toBe(403);
    expect((await registrarPago(datos, tokenEst)).status).toBe(403);
  });

  test("CP-058 · el admin ve el estado de membresía de cada estudiante", async () => {
    const { estudiante: alDia } = await estudianteSinPagos("aldia@pagos.test");
    const { estudiante: vencido } = await estudianteSinPagos("vencido@pagos.test");
    await estudianteSinPagos("nuevo@pagos.test");
    await darMembresia(tenant.id, alDia.id);
    await darMembresia(tenant.id, vencido.id, { vigenteHasta: new Date(Date.now() - UN_DIA) });

    const res = await comoAdmin("get", "/api/pagos/membresias");
    const estados = Object.fromEntries(res.body.map((e) => [e.email, e.membresia.estado]));
    expect(estados).toEqual({ "aldia@pagos.test": "AL_DIA", "vencido@pagos.test": "VENCIDA", "nuevo@pagos.test": "SIN_PAGOS" });
  });
});

describe("RF-12 · HU-12: el estudiante consulta sus pagos", () => {
  test("CP-059 · ve su estado y solo sus propios pagos", async () => {
    const { estudiante, token } = await estudianteSinPagos("est@pagos.test");
    const { estudiante: otro } = await estudianteSinPagos("otro@pagos.test");
    await registrarPago({ estudianteId: estudiante.id, tarifaId: tarifa.id, medio: "EFECTIVO" });
    await registrarPago({ estudianteId: otro.id, tarifaId: tarifa.id, medio: "TARJETA" });

    const res = await request(app).get("/api/pagos/mios").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.membresia.estado).toBe("AL_DIA");
    expect(res.body.pagos).toHaveLength(1);
    expect(res.body.pagos[0].medio).toBe("EFECTIVO");
  });

  test("CP-060 · sin pagos responde normal e indica que no hay pagos", async () => {
    const { token } = await estudianteSinPagos("est@pagos.test");

    const res = await request(app).get("/api/pagos/mios").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ membresia: { estado: "SIN_PAGOS", vigenteHasta: null, diasRestantes: 0 }, pagos: [] });
  });
});

describe("RF-13 · HU-13: membresía vencida bloquea la reserva (RN-05)", () => {
  async function claseFutura() {
    const profesor = await crearUsuario(tenant.id, "PROFESOR");
    const salon = await crearSalon(tenant.id);
    const ritmo = await crearRitmo(tenant.id);
    const inicio = new Date(Date.now() + 7 * UN_DIA);
    return prisma.clase.create({
      data: {
        tenantId: tenant.id,
        ritmoId: ritmo.id,
        salonId: salon.id,
        profesorId: profesor.id,
        cupoMaximo: 5,
        cuposDisponibles: 5,
        fechaHoraInicio: inicio,
        fechaHoraFin: new Date(inicio.getTime() + 60 * 60 * 1000),
      },
    });
  }

  function reservar(claseId, token) {
    return request(app).post("/api/reservas").set("Authorization", `Bearer ${token}`).send({ claseId });
  }

  test("CP-061 · con la membresía vencida no puede reservar y el cupo no se toca", async () => {
    const clase = await claseFutura();
    const { estudiante, token } = await estudianteSinPagos("est@pagos.test");
    await darMembresia(tenant.id, estudiante.id, { vigenteHasta: new Date(Date.now() - UN_DIA) });

    const res = await reservar(clase.id, token);
    expect(res.status).toBe(403);
    expect(res.body.codigo).toBe("MEMBRESIA_VENCIDA");
    expect((await prisma.clase.findUnique({ where: { id: clase.id } })).cuposDisponibles).toBe(5);
  });

  test("CP-062 · sin ningún pago tampoco puede reservar", async () => {
    const clase = await claseFutura();
    const { token } = await estudianteSinPagos("est@pagos.test");

    const res = await reservar(clase.id, token);
    expect(res.status).toBe(403);
    expect(res.body.membresia.estado).toBe("SIN_PAGOS");
  });

  test("CP-063 · apenas el admin registra el pago, puede reservar", async () => {
    const clase = await claseFutura();
    const { estudiante, token } = await estudianteSinPagos("est@pagos.test");
    expect((await reservar(clase.id, token)).status).toBe(403);

    await registrarPago({ estudianteId: estudiante.id, tarifaId: tarifa.id, medio: "EFECTIVO" });
    expect((await reservar(clase.id, token)).status).toBe(201);
  });
});

describe("RF-20 · HU-20: reporte de ingresos", () => {
  test("CP-064 · suma los pagos del rango por tarifa y por medio, sin contar los de fuera", async () => {
    const { estudiante } = await estudianteSinPagos("est@pagos.test");
    const tiquetera = await crearTarifa(tenant.id, { nombre: "Tiquetera", valor: 80000, duracionDias: 30 });
    await registrarPago({ estudianteId: estudiante.id, tarifaId: tarifa.id, medio: "EFECTIVO" });
    await registrarPago({ estudianteId: estudiante.id, tarifaId: tarifa.id, medio: "TRANSFERENCIA", monto: 100000 });
    await registrarPago({ estudianteId: estudiante.id, tarifaId: tiquetera.id, medio: "EFECTIVO" });
    const antiguo = await darMembresia(tenant.id, estudiante.id);
    await prisma.pago.update({ where: { id: antiguo.id }, data: { registradoEn: new Date("2025-01-15T12:00:00-05:00") } });

    const hoy = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10); // día en Colombia
    const res = await comoAdmin("get", `/api/reportes/ingresos?desde=${hoy}&hasta=${hoy}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(300000);
    expect(res.body.cantidadPagos).toBe(3);
    expect(res.body.porTarifa).toEqual([
      { nombreTarifa: "Mensualidad", pagos: 2, total: 220000 },
      { nombreTarifa: "Tiquetera", pagos: 1, total: 80000 },
    ]);
    expect(res.body.porMedio).toEqual([
      { medio: "EFECTIVO", pagos: 2, total: 200000 },
      { medio: "TRANSFERENCIA", pagos: 1, total: 100000 },
    ]);
  });

  test("CP-065 · rechaza fechas faltantes o con formato inválido (400)", async () => {
    expect((await comoAdmin("get", "/api/reportes/ingresos")).status).toBe(400);
    expect((await comoAdmin("get", "/api/reportes/ingresos?desde=01-10-2026&hasta=2026-10-31")).status).toBe(400);
  });
});
