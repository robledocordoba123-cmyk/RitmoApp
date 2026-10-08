const request = require("supertest");
const app = require("../src/app");
const { limpiarBD, prisma } = require("./helpers/db");
const { crearAcademia, crearUsuario, crearSalon, crearRitmo } = require("./helpers/fixtures");
const { login } = require("./helpers/auth");

beforeEach(async () => {
  await limpiarBD();
});

afterAll(async () => {
  await prisma.$disconnect();
});

// El admin necesita esta lista para poder asignar un profesor al programar
// una clase (RF-05).
describe("RF-17 · HU-17: listar profesores y estudiantes", () => {
  test("CP-015 · el admin lista solo los profesores de su propia academia", async () => {
    const academiaA = await crearAcademia();
    const academiaB = await crearAcademia();
    await crearUsuario(academiaA.id, "ADMIN_ACADEMIA", { email: "admin@usuarios.test" });
    await crearUsuario(academiaA.id, "PROFESOR", { email: "profeA@usuarios.test", nombre: "Profe A" });
    await crearUsuario(academiaB.id, "PROFESOR", { email: "profeB@usuarios.test", nombre: "Profe B" });

    const token = await login("admin@usuarios.test");
    const res = await request(app).get("/api/usuarios?rol=PROFESOR").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].nombre).toBe("Profe A");
  });

  test("CP-016 · rechaza un rol no consultable (400)", async () => {
    const academia = await crearAcademia();
    await crearUsuario(academia.id, "ADMIN_ACADEMIA", { email: "admin2@usuarios.test" });
    const token = await login("admin2@usuarios.test");

    const res = await request(app).get("/api/usuarios?rol=SUPERADMIN").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(400);
  });
});

// El admin es quien da de alta a profesores y estudiantes de su academia;
// no existe autorregistro público para estos dos roles.
describe("RF-17 · HU-17: el admin crea profesores y estudiantes", () => {
  test("CP-017 · crea un profesor en la academia del admin", async () => {
    const academia = await crearAcademia();
    await crearUsuario(academia.id, "ADMIN_ACADEMIA", { email: "admin3@usuarios.test" });
    const token = await login("admin3@usuarios.test");

    const res = await request(app)
      .post("/api/usuarios")
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "Profe Nuevo", email: "profenuevo@usuarios.test", password: "Prueba123!", rol: "PROFESOR" });

    expect(res.status).toBe(201);
    expect(res.body.rol).toBe("PROFESOR");
    expect(res.body.passwordHash).toBeUndefined();

    const creado = await prisma.user.findUnique({ where: { email: "profenuevo@usuarios.test" } });
    expect(creado.tenantId).toBe(academia.id);
  });

  test("CP-018 · rechaza un correo ya usado (409)", async () => {
    const academia = await crearAcademia();
    await crearUsuario(academia.id, "ADMIN_ACADEMIA", { email: "admin4@usuarios.test" });
    await crearUsuario(academia.id, "ESTUDIANTE", { email: "repetido2@usuarios.test" });
    const token = await login("admin4@usuarios.test");

    const res = await request(app)
      .post("/api/usuarios")
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "Otro", email: "repetido2@usuarios.test", password: "Prueba123!", rol: "ESTUDIANTE" });

    expect(res.status).toBe(409);
  });

  test("CP-019 · rechaza crear un rol no permitido, como ADMIN_ACADEMIA (400)", async () => {
    const academia = await crearAcademia();
    await crearUsuario(academia.id, "ADMIN_ACADEMIA", { email: "admin5@usuarios.test" });
    const token = await login("admin5@usuarios.test");

    const res = await request(app)
      .post("/api/usuarios")
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "Intento", email: "intento@usuarios.test", password: "Prueba123!", rol: "ADMIN_ACADEMIA" });

    expect(res.status).toBe(400);
  });

  test("CP-020 · un profesor no puede crear usuarios (403)", async () => {
    const academia = await crearAcademia();
    await crearUsuario(academia.id, "PROFESOR", { email: "profe6@usuarios.test" });
    const token = await login("profe6@usuarios.test");

    const res = await request(app)
      .post("/api/usuarios")
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "X", email: "x@usuarios.test", password: "Prueba123!", rol: "ESTUDIANTE" });

    expect(res.status).toBe(403);
  });
});

// El admin corrige datos y desactiva o reactiva a su equipo; nunca borra a
// nadie, para no perder el historial.
describe("RF-17 · HU-17: el admin edita y desactiva profesores y estudiantes", () => {
  const UN_DIA = 24 * 60 * 60 * 1000;
  let academia;
  let token;

  beforeEach(async () => {
    academia = await crearAcademia();
    await crearUsuario(academia.id, "ADMIN_ACADEMIA", { email: "admin@editar.test" });
    token = await login("admin@editar.test");
  });

  function editar(id, datos) {
    return request(app).patch(`/api/usuarios/${id}`).set("Authorization", `Bearer ${token}`).send(datos);
  }

  async function claseFutura(profesorId, cupo = 5) {
    const salon = await crearSalon(academia.id);
    const ritmo = await crearRitmo(academia.id);
    const inicio = new Date(Date.now() + 3 * UN_DIA);
    return prisma.clase.create({
      data: {
        tenantId: academia.id,
        ritmoId: ritmo.id,
        salonId: salon.id,
        profesorId,
        cupoMaximo: cupo,
        cuposDisponibles: cupo,
        fechaHoraInicio: inicio,
        fechaHoraFin: new Date(inicio.getTime() + 60 * 60 * 1000),
      },
    });
  }

  test("CP-073 · edita el nombre y el correo de un profesor", async () => {
    const profe = await crearUsuario(academia.id, "PROFESOR", { email: "viejo@editar.test" });

    const res = await editar(profe.id, { nombre: "Laura Gómez", email: "Laura@Editar.test" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ nombre: "Laura Gómez", email: "laura@editar.test" });
    expect(res.body.passwordHash).toBeUndefined();
  });

  test("CP-074 · rechaza un correo que ya usa otra persona (409)", async () => {
    const profe = await crearUsuario(academia.id, "PROFESOR");
    await crearUsuario(academia.id, "ESTUDIANTE", { email: "ocupado@editar.test" });

    expect((await editar(profe.id, { email: "ocupado@editar.test" })).status).toBe(409);
  });

  test("CP-075 · no puede editar usuarios de otra academia ni administradores (404)", async () => {
    const otra = await crearAcademia();
    const ajeno = await crearUsuario(otra.id, "ESTUDIANTE");
    const otroAdmin = await crearUsuario(academia.id, "ADMIN_ACADEMIA");

    expect((await editar(ajeno.id, { nombre: "X" })).status).toBe(404);
    expect((await editar(otroAdmin.id, { activo: false })).status).toBe(404);
  });

  test("CP-076 · un estudiante desactivado no entra y sus cupos futuros quedan libres", async () => {
    const profe = await crearUsuario(academia.id, "PROFESOR");
    const clase = await claseFutura(profe.id);
    const est = await crearUsuario(academia.id, "ESTUDIANTE", { email: "baja@editar.test" });
    const tokenEst = await login("baja@editar.test");
    await request(app).post("/api/reservas").set("Authorization", `Bearer ${tokenEst}`).send({ claseId: clase.id });

    const res = await editar(est.id, { activo: false });
    expect(res.status).toBe(200);
    expect(res.body.activo).toBe(false);
    expect(await login("baja@editar.test")).toBeUndefined();
    expect((await prisma.clase.findUnique({ where: { id: clase.id } })).cuposDisponibles).toBe(5);
    expect((await prisma.reserva.findFirst({ where: { estudianteId: est.id } })).estado).toBe("CANCELADA");
  });

  test("CP-077 · no deja desactivar a un profesor con clases programadas (409, RN-13)", async () => {
    const profe = await crearUsuario(academia.id, "PROFESOR");
    await claseFutura(profe.id);

    const res = await editar(profe.id, { activo: false });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/1 clase programada/);
  });

  test("CP-078 · al reactivarlo vuelve a entrar y aparece en la lista con inactivos", async () => {
    const est = await crearUsuario(academia.id, "ESTUDIANTE", { email: "vuelve@editar.test", activo: false });

    const lista = await request(app).get("/api/usuarios?rol=ESTUDIANTE&incluirInactivos=true").set("Authorization", `Bearer ${token}`);
    expect(lista.body.map((u) => u.email)).toContain("vuelve@editar.test");

    expect((await editar(est.id, { activo: true })).status).toBe(200);
    expect(await login("vuelve@editar.test")).toBeDefined();
  });
});
