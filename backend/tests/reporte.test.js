const request = require("supertest");
const app = require("../src/app");
const { limpiarBD, prisma } = require("./helpers/db");
const { crearAcademia, crearUsuario, crearSalon, crearRitmo } = require("./helpers/fixtures");
const { login } = require("./helpers/auth");

let tenant;
let tokenAdmin;
let profesor;
let salon;
let ritmo;

beforeEach(async () => {
  await limpiarBD();
  tenant = await crearAcademia();
  await crearUsuario(tenant.id, "ADMIN_ACADEMIA", { email: "admin@reporte.test" });
  profesor = await crearUsuario(tenant.id, "PROFESOR", { email: "profe@reporte.test" });
  salon = await crearSalon(tenant.id, { nombre: "Salón Principal", capacidad: 20 });
  ritmo = await crearRitmo(tenant.id);
  tokenAdmin = await login("admin@reporte.test");
});

afterAll(async () => {
  await prisma.$disconnect();
});

// Crea la clase directo en BD para controlar fecha, estado y cupos ocupados.
async function crearClase({ inicio, cupoMaximo = 10, reservas = 0, estado = "PROGRAMADA" }) {
  const clase = await prisma.clase.create({
    data: {
      tenantId: tenant.id,
      ritmoId: ritmo.id,
      salonId: salon.id,
      profesorId: profesor.id,
      cupoMaximo,
      cuposDisponibles: cupoMaximo - reservas,
      fechaHoraInicio: new Date(inicio),
      fechaHoraFin: new Date(new Date(inicio).getTime() + 60 * 60 * 1000),
      estado,
    },
  });
  for (let i = 0; i < reservas; i++) {
    const estudiante = await crearUsuario(tenant.id, "ESTUDIANTE");
    await prisma.reserva.create({
      data: { tenantId: tenant.id, claseId: clase.id, estudianteId: estudiante.id, estado: "CONFIRMADA" },
    });
  }
  return clase;
}

function pedirReporte(desde, hasta) {
  return request(app)
    .get(`/api/reportes/ocupacion?desde=${desde}&hasta=${hasta}`)
    .set("Authorization", `Bearer ${tokenAdmin}`);
}

describe("RF-20 · HU-20: reporte de ocupación por salón", () => {
  test("CP-040 · calcula el porcentaje de ocupación del salón", async () => {
    await crearClase({ inicio: "2027-02-10T15:00:00.000Z", cupoMaximo: 10, reservas: 4 });

    const res = await pedirReporte("2027-02-01", "2027-02-28");

    expect(res.status).toBe(200);
    expect(res.body.salones).toHaveLength(1);
    expect(res.body.salones[0]).toMatchObject({
      salon: "Salón Principal",
      totalClases: 1,
      capacidadOfertada: 10,
      reservasConfirmadas: 4,
      porcentajeOcupacion: 40,
    });
  });

  test("CP-041 · incluye las clases del último día del rango, también las de la noche", async () => {
    // 7:00 p. m. del 28 de febrero en Bogotá = 00:00 UTC del 1 de marzo.
    await crearClase({ inicio: "2027-03-01T00:00:00.000Z", reservas: 2 });

    const res = await pedirReporte("2027-02-01", "2027-02-28");

    expect(res.body.salones[0].totalClases).toBe(1);
  });

  test("CP-042 · no cuenta las clases canceladas", async () => {
    await crearClase({ inicio: "2027-02-10T15:00:00.000Z", cupoMaximo: 10, reservas: 5 });
    await crearClase({ inicio: "2027-02-11T15:00:00.000Z", cupoMaximo: 10, estado: "CANCELADA" });

    const res = await pedirReporte("2027-02-01", "2027-02-28");

    expect(res.body.salones[0].totalClases).toBe(1);
    expect(res.body.salones[0].porcentajeOcupacion).toBe(50);
  });

  test("CP-043 · rechaza fechas con formato inválido o rango invertido (400)", async () => {
    expect((await pedirReporte("10-02-2027", "2027-02-28")).status).toBe(400);
    expect((await pedirReporte("2027-02-28", "2027-02-01")).status).toBe(400);
  });

  test("CP-044 · solo el admin de la academia puede ver el reporte (403)", async () => {
    const tokenProfesor = await login("profe@reporte.test");
    const res = await request(app)
      .get("/api/reportes/ocupacion?desde=2027-02-01&hasta=2027-02-28")
      .set("Authorization", `Bearer ${tokenProfesor}`);
    expect(res.status).toBe(403);
  });
});
