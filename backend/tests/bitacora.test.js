const request = require("supertest");
const app = require("../src/app");
const { limpiarBD, prisma } = require("./helpers/db");
const { crearAcademia, crearUsuario, crearRitmo, crearTarifa } = require("./helpers/fixtures");
const { login } = require("./helpers/auth");

// RF-21 · HU-21: bitácora de auditoría.

let academia;
let profesor;
let tokenAdmin;

beforeEach(async () => {
  await limpiarBD();
  academia = await crearAcademia();
  await crearUsuario(academia.id, "ADMIN_ACADEMIA", { email: "admin@bita.test", nombre: "Admin Uno" });
  profesor = await crearUsuario(academia.id, "PROFESOR", { email: "profe@bita.test", nombre: "Profe Uno" });
  tokenAdmin = await login("admin@bita.test");
});

afterAll(async () => {
  await prisma.$disconnect();
});


function consultar(token = tokenAdmin) {
  return request(app).get("/api/bitacora").set("Authorization", `Bearer ${token}`);
}

function como(token) {
  return {
    post: (ruta, datos) => request(app).post(`/api${ruta}`).set("Authorization", `Bearer ${token}`).send(datos),
  };
}

describe("RF-21 · HU-21: bitácora de auditoría", () => {
  test("CP-156 · cada cambio queda con usuario, acción, detalle y fecha, del más reciente al más antiguo", async () => {
    const admin = como(tokenAdmin);
    const salon = await admin.post("/salones", { nombre: "Salón Espejos", capacidad: 20 });
    const ritmo = await crearRitmo(academia.id);
    const inicio = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    await admin.post("/clases", {
      ritmoId: ritmo.id, salonId: salon.body.id, profesorId: profesor.id, cupoMaximo: 10,
      fechaHoraInicio: inicio.toISOString(), fechaHoraFin: new Date(inicio.getTime() + 3600000).toISOString(),
    });
    const ana = await crearUsuario(academia.id, "ESTUDIANTE", { email: "ana@bita.test", membresia: false });
    const tarifa = await crearTarifa(academia.id, { nombre: "Mensualidad", valor: 120000 });
    await admin.post("/pagos", { estudianteId: ana.id, tarifaId: tarifa.id, medio: "EFECTIVO" });

    const res = await consultar();

    expect(res.status).toBe(200);
    expect(res.body.map((m) => m.accion)).toEqual(["Registró un pago", "Programó una clase", "Creó un salón"]);
    expect(res.body[0].detalle).toMatch(/^Mensualidad · \$\s?120\.000$/);
    expect(res.body[2].detalle).toBe("Salón Espejos");
    expect(res.body[0].usuario).toEqual({ nombre: "Admin Uno", rol: "ADMIN_ACADEMIA" });
    expect(new Date(res.body[0].fecha).getTime()).not.toBeNaN();
  });

  test("CP-157 · sin movimientos la bitácora está vacía", async () => {
    const res = await consultar();
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test("CP-158 · solo aparecen movimientos de mi academia, nunca de otras (RN-04)", async () => {
    const otra = await crearAcademia();
    await crearUsuario(otra.id, "ADMIN_ACADEMIA", { email: "admin@otra.test" });
    await como(await login("admin@otra.test")).post("/salones", { nombre: "Salón de la otra", capacidad: 10 });
    await como(tokenAdmin).post("/ritmos", { nombre: "Tango" });

    const res = await consultar();

    expect(res.body).toHaveLength(1);
    expect(res.body[0].detalle).toBe("Tango");
  });

  test("CP-159 · las acciones que fallan y las consultas no se anotan; las del estudiante sí", async () => {
    const admin = como(tokenAdmin);
    await admin.post("/salones", { nombre: "" }); // 400
    await request(app).get("/api/salones").set("Authorization", `Bearer ${tokenAdmin}`);
    await crearUsuario(academia.id, "ESTUDIANTE", { email: "beto@bita.test", nombre: "Beto" });
    await como(await login("beto@bita.test")).post("/reservas", { claseId: "no-existe" }); // 404
    await admin.post("/ritmos", { nombre: "Salsa" });

    const res = await consultar();

    expect(res.body.map((m) => m.accion)).toEqual(["Creó un ritmo"]);
  });

  test("CP-160 · profesor y estudiante no pueden ver la bitácora", async () => {
    await crearUsuario(academia.id, "ESTUDIANTE", { email: "cami@bita.test" });
    expect((await consultar(await login("profe@bita.test"))).status).toBe(403);
    expect((await consultar(await login("cami@bita.test"))).status).toBe(403);
  });

  test("CP-162 · si la bitácora falla, la acción igual se completa", async () => {
    const original = prisma.bitacora.create;
    prisma.bitacora.create = () => Promise.reject(new Error("BD caída"));
    const error = jest.spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await como(tokenAdmin).post("/ritmos", { nombre: "Merengue" });
      expect(res.status).toBe(201);
      expect(res.body.nombre).toBe("Merengue");
      expect(error).toHaveBeenCalled();
    } finally {
      prisma.bitacora.create = original;
      error.mockRestore();
    }
  });

  test("CP-161 · crear un usuario se anota con nombre y rol, sin el correo ni la contraseña", async () => {
    await como(tokenAdmin).post("/usuarios", {
      nombre: "Dani Ruiz", email: "dani@bita.test", password: "Clave-segura-123", rol: "PROFESOR", autorizacionDatos: true,
    });

    const res = await consultar();
    const fila = await prisma.bitacora.findFirst();

    expect(res.body[0]).toMatchObject({ accion: "Creó un usuario", detalle: "Dani Ruiz (profesor)" });
    expect(JSON.stringify(fila)).not.toMatch(/dani@bita\.test|Clave-segura/);
  });
});
