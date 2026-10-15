const request = require("supertest");
const app = require("../src/app");
const { limpiarBD, prisma } = require("./helpers/db");
const { crearAcademia, crearUsuario, crearSalon, crearRitmo } = require("./helpers/fixtures");
const { login } = require("./helpers/auth");

// AM-02 (DOC-07): RF-15 solo tenía una prueba manual del 06/10/2026.

let academia;
let profesor;
let tokenProfesor;

beforeEach(async () => {
  await limpiarBD();
  academia = await crearAcademia();
  await crearUsuario(academia.id, "ADMIN_ACADEMIA", { email: "admin@inscritos.test" });
  profesor = await crearUsuario(academia.id, "PROFESOR", { email: "profe@inscritos.test" });
  tokenProfesor = await login("profe@inscritos.test");
});

afterAll(async () => {
  await prisma.$disconnect();
});

// Crea la clase directo en BD para no depender del motor de agendamiento.
async function crearClase(tenantId, profesorId) {
  const salon = await crearSalon(tenantId);
  const ritmo = await crearRitmo(tenantId);
  return prisma.clase.create({
    data: {
      tenantId,
      ritmoId: ritmo.id,
      salonId: salon.id,
      profesorId,
      cupoMaximo: 10,
      cuposDisponibles: 10,
      fechaHoraInicio: new Date("2027-01-10T18:00:00.000Z"),
      fechaHoraFin: new Date("2027-01-10T19:00:00.000Z"),
    },
  });
}

async function inscribir(clase, email, nombre, estado = "CONFIRMADA") {
  const estudiante = await crearUsuario(clase.tenantId, "ESTUDIANTE", { email, nombre });
  await prisma.reserva.create({
    data: { tenantId: clase.tenantId, claseId: clase.id, estudianteId: estudiante.id, estado },
  });
  return estudiante;
}

function verInscritos(claseId, token = tokenProfesor) {
  return request(app).get(`/api/clases/${claseId}/inscritos`).set("Authorization", `Bearer ${token}`);
}

describe("RF-15 · HU-15: el profesor ve los inscritos de su clase", () => {
  test("CP-112 · muestra solo las reservas confirmadas, con nombre y correo, en orden alfabético", async () => {
    const clase = await crearClase(academia.id, profesor.id);
    await inscribir(clase, "zoe@inscritos.test", "Zoe Restrepo");
    await inscribir(clase, "ana@inscritos.test", "Ana Gómez");
    await inscribir(clase, "cancelo@inscritos.test", "Carlos Canceló", "CANCELADA");

    const res = await verInscritos(clase.id);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      expect.objectContaining({ nombre: "Ana Gómez", email: "ana@inscritos.test", estadoAsistencia: null }),
      expect.objectContaining({ nombre: "Zoe Restrepo", email: "zoe@inscritos.test", estadoAsistencia: null }),
    ]);
  });

  test("CP-113 · muestra la asistencia ya registrada de cada estudiante", async () => {
    const clase = await crearClase(academia.id, profesor.id);
    const ana = await inscribir(clase, "ana@inscritos.test", "Ana Gómez");
    await inscribir(clase, "zoe@inscritos.test", "Zoe Restrepo");
    await prisma.asistencia.create({
      data: { tenantId: academia.id, claseId: clase.id, estudianteId: ana.id, estado: "EXCUSA", registradoPorId: profesor.id },
    });

    const res = await verInscritos(clase.id);

    expect(res.body.map((i) => i.estadoAsistencia)).toEqual(["EXCUSA", null]);
  });

  test("CP-114 · una clase sin inscritos responde una lista vacía", async () => {
    const clase = await crearClase(academia.id, profesor.id);

    const res = await verInscritos(clase.id);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test("CP-115 · otro profesor de la misma academia no puede ver la lista (403)", async () => {
    const clase = await crearClase(academia.id, profesor.id);
    await inscribir(clase, "ana@inscritos.test", "Ana Gómez");
    await crearUsuario(academia.id, "PROFESOR", { email: "otro@inscritos.test" });

    const res = await verInscritos(clase.id, await login("otro@inscritos.test"));

    expect(res.status).toBe(403);
  });

  test("CP-116 · la clase de otra academia no existe para el profesor (404)", async () => {
    const otraAcademia = await crearAcademia({ nombre: "Otra Academia" });
    const profeAjeno = await crearUsuario(otraAcademia.id, "PROFESOR");
    const claseAjena = await crearClase(otraAcademia.id, profeAjeno.id);

    const res = await verInscritos(claseAjena.id);

    expect(res.status).toBe(404);
  });

  test("CP-117 · un estudiante no puede ver la lista de inscritos (403)", async () => {
    const clase = await crearClase(academia.id, profesor.id);
    await inscribir(clase, "ana@inscritos.test", "Ana Gómez");

    const res = await verInscritos(clase.id, await login("ana@inscritos.test"));

    expect(res.status).toBe(403);
  });
});
