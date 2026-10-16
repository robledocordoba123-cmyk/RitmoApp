const request = require("supertest");
const app = require("../src/app");
const correo = require("../src/utils/correo");
const { limpiarBD, prisma } = require("./helpers/db");
const { crearAcademia, crearUsuario, crearSalon, crearRitmo, crearTarifa } = require("./helpers/fixtures");
const { login } = require("./helpers/auth");

// OE-6: notificaciones por correo al cancelar una clase y al registrar un pago.

let academia;
let profesor;
let tokenAdmin;
let enviar;

beforeEach(async () => {
  await limpiarBD();
  academia = await crearAcademia();
  await crearUsuario(academia.id, "ADMIN_ACADEMIA", { email: "admin@notif.test" });
  profesor = await crearUsuario(academia.id, "PROFESOR", { email: "profe@notif.test" });
  tokenAdmin = await login("admin@notif.test");
  enviar = jest.spyOn(correo, "enviarCorreo").mockResolvedValue(undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function clase(dias) {
  const salon = await crearSalon(academia.id, { nombre: "Salón Espejos" });
  const ritmo = await crearRitmo(academia.id, { nombre: "Bachata" });
  const inicio = new Date(Date.now() + dias * 24 * 60 * 60 * 1000);
  return prisma.clase.create({
    data: {
      tenantId: academia.id, ritmoId: ritmo.id, salonId: salon.id, profesorId: profesor.id,
      cupoMaximo: 10, cuposDisponibles: 8, fechaHoraInicio: inicio, fechaHoraFin: new Date(inicio.getTime() + 3600000),
    },
  });
}

async function inscribir(c, email, nombre, estado = "CONFIRMADA") {
  const e = await crearUsuario(academia.id, "ESTUDIANTE", { email, nombre });
  await prisma.reserva.create({ data: { tenantId: academia.id, claseId: c.id, estudianteId: e.id, estado } });
  return e;
}

function cancelar(c) {
  return request(app).patch(`/api/clases/${c.id}/cancelar`).set("Authorization", `Bearer ${tokenAdmin}`);
}

describe("OE-6: notificaciones por correo", () => {
  test("CP-146 · al cancelar una clase futura avisa a cada estudiante con reserva confirmada, y solo a ellos", async () => {
    const c = await clase(2);
    await inscribir(c, "ana@notif.test", "Ana");
    await inscribir(c, "beto@notif.test", "Beto");
    await inscribir(c, "cami@notif.test", "Cami", "CANCELADA");

    const res = await cancelar(c);

    expect(res.status).toBe(200);
    expect(res.body.estado).toBe("CANCELADA");
    expect(enviar.mock.calls.map(([m]) => m.para).sort()).toEqual(["ana@notif.test", "beto@notif.test"]);
    const [mensaje] = enviar.mock.calls[0];
    expect(mensaje.asunto).toMatch(/^Clase cancelada: Bachata/);
    expect(mensaje.texto).toContain("Bachata en Salón Espejos");
  });

  test("CP-147 · cancelar otra vez la misma clase no repite el aviso, y una clase pasada no avisa", async () => {
    const futura = await clase(2);
    await inscribir(futura, "ana@notif.test", "Ana");
    await cancelar(futura);
    const segunda = await cancelar(futura);

    const pasada = await clase(-1);
    await inscribir(pasada, "beto@notif.test", "Beto");
    await cancelar(pasada);

    expect(segunda.status).toBe(200);
    expect(enviar).toHaveBeenCalledTimes(1);
  });

  test("CP-148 · al registrar un pago el estudiante recibe el comprobante con el valor y la vigencia", async () => {
    const ana = await crearUsuario(academia.id, "ESTUDIANTE", { email: "ana@notif.test", nombre: "Ana", membresia: false });
    const tarifa = await crearTarifa(academia.id, { nombre: "Mensualidad", valor: 120000, duracionDias: 30 });

    const res = await request(app)
      .post("/api/pagos")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ estudianteId: ana.id, tarifaId: tarifa.id, medio: "TRANSFERENCIA" });

    expect(res.status).toBe(201);
    expect(enviar).toHaveBeenCalledTimes(1);
    const [mensaje] = enviar.mock.calls[0];
    expect(mensaje.para).toBe("ana@notif.test");
    expect(mensaje.asunto).toMatch(/Pago registrado: Mensualidad/);
    expect(mensaje.texto).toMatch(/120\.000/);
    expect(mensaje.texto).toMatch(/vigente hasta el/);
    expect(mensaje.texto).toContain("transferencia");
  });

  test("CP-149 · si el correo falla, la clase igual queda cancelada y el pago igual queda registrado", async () => {
    enviar.mockRejectedValue(new Error("Brevo no responde"));
    const error = jest.spyOn(console, "error").mockImplementation(() => {});
    const c = await clase(2);
    const ana = await inscribir(c, "ana@notif.test", "Ana");
    const tarifa = await crearTarifa(academia.id);

    const r1 = await cancelar(c);
    const r2 = await request(app).post("/api/pagos").set("Authorization", `Bearer ${tokenAdmin}`).send({ estudianteId: ana.id, tarifaId: tarifa.id, medio: "EFECTIVO" });
    await new Promise((r) => setTimeout(r, 50));

    expect(r1.status).toBe(200);
    expect(r2.status).toBe(201);
    expect(error).toHaveBeenCalled();
  });

  test("CP-150 · los nombres escritos por usuarios se escapan en el HTML del correo", async () => {
    const c = await clase(2);
    await inscribir(c, "ana@notif.test", "<script>alert(1)</script>");

    await cancelar(c);

    const [mensaje] = enviar.mock.calls[0];
    expect(mensaje.html).not.toContain("<script>");
    expect(mensaje.html).toContain("&lt;script&gt;");
  });
});
