const request = require("supertest");
const app = require("../src/app");
const { limpiarBD, prisma } = require("./helpers/db");
const { crearAcademia, crearUsuario, crearSalon, crearRitmo } = require("./helpers/fixtures");
const { login } = require("./helpers/auth");

let tenant;
let profesor;
let estudiante;
let tokenProfesor;

beforeEach(async () => {
  await limpiarBD();
  tenant = await crearAcademia();
  profesor = await crearUsuario(tenant.id, "PROFESOR", { email: "profe@asistencia.test" });
  estudiante = await crearUsuario(tenant.id, "ESTUDIANTE", { email: "est@asistencia.test" });
  tokenProfesor = await login("profe@asistencia.test");
});

afterAll(async () => {
  await prisma.$disconnect();
});

// Crea una clase directamente en BD (sin pasar por el motor de agendamiento)
// para controlar la fecha exacta, y una reserva confirmada, simulando que el
// estudiante se inscribió cuando la clase todavía era futura.
async function crearClaseConReserva(fechaHoraInicio) {
  const salon = await crearSalon(tenant.id);
  const ritmo = await crearRitmo(tenant.id);
  const clase = await prisma.clase.create({
    data: {
      tenantId: tenant.id,
      ritmoId: ritmo.id,
      salonId: salon.id,
      profesorId: profesor.id,
      cupoMaximo: 5,
      cuposDisponibles: 4,
      fechaHoraInicio,
      fechaHoraFin: new Date(fechaHoraInicio.getTime() + 60 * 60 * 1000),
    },
  });
  await prisma.reserva.create({
    data: { tenantId: tenant.id, claseId: clase.id, estudianteId: estudiante.id, estado: "CONFIRMADA" },
  });
  return clase;
}

describe("RF-07 / CU-03: registro de asistencia", () => {
  test("el profesor asignado registra asistencia de una clase de hoy", async () => {
    const haceDosHoras = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const clase = await crearClaseConReserva(haceDosHoras);

    const res = await request(app)
      .post(`/api/clases/${clase.id}/asistencia`)
      .set("Authorization", `Bearer ${tokenProfesor}`)
      .send({ asistencias: [{ estudianteId: estudiante.id, estado: "ASISTIO" }] });

    expect(res.status).toBe(200);
    expect(res.body[0].estado).toBe("ASISTIO");
  });

  test("rechaza registrar asistencia de una clase que no es de hoy (400)", async () => {
    const otroDia = new Date("2027-03-01T18:00:00.000Z");
    const clase = await crearClaseConReserva(otroDia);

    const res = await request(app)
      .post(`/api/clases/${clase.id}/asistencia`)
      .set("Authorization", `Bearer ${tokenProfesor}`)
      .send({ asistencias: [{ estudianteId: estudiante.id, estado: "ASISTIO" }] });

    expect(res.status).toBe(400);
  });

  test("rechaza a un profesor que no es el asignado a la clase (403)", async () => {
    const otroProfesor = await crearUsuario(tenant.id, "PROFESOR", { email: "otroprofe@asistencia.test" });
    const tokenOtroProfesor = await login("otroprofe@asistencia.test");
    const clase = await crearClaseConReserva(new Date(Date.now() - 60 * 60 * 1000));

    const res = await request(app)
      .post(`/api/clases/${clase.id}/asistencia`)
      .set("Authorization", `Bearer ${tokenOtroProfesor}`)
      .send({ asistencias: [{ estudianteId: estudiante.id, estado: "ASISTIO" }] });

    expect(res.status).toBe(403);
  });

  test("rechaza marcar asistencia de un estudiante sin reserva confirmada (400)", async () => {
    const clase = await crearClaseConReserva(new Date(Date.now() - 60 * 60 * 1000));
    const otroEstudiante = await crearUsuario(tenant.id, "ESTUDIANTE", { email: "sinreserva@asistencia.test" });

    const res = await request(app)
      .post(`/api/clases/${clase.id}/asistencia`)
      .set("Authorization", `Bearer ${tokenProfesor}`)
      .send({ asistencias: [{ estudianteId: otroEstudiante.id, estado: "ASISTIO" }] });

    expect(res.status).toBe(400);
  });
});
