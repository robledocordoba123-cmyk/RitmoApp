const express = require("express");
const jwt = require("jsonwebtoken");
const request = require("supertest");
const { crearRegistroDePeticiones } = require("../src/middlewares/registro");
const { requireAuth, requireRole } = require("../src/middlewares/auth");

// App mínima con el mismo orden de middlewares que src/app.js. Las líneas de
// log se guardan en un arreglo en vez de ir a la consola.
function crearApp() {
  const lineas = [];
  const app = express();
  app.use(crearRegistroDePeticiones({ escribir: (linea) => lineas.push(JSON.parse(linea)) }));
  app.use(express.json());
  app.get("/api/health", (req, res) => res.json({ status: "ok" }));
  app.post("/api/auth/login", (req, res) => res.status(401).json({ error: "Credenciales inválidas." }));
  app.get("/api/pagos", requireAuth, requireRole("ADMIN"), (req, res) => res.json([]));
  app.use((err, req, res, next) => res.status(400).json({ error: "JSON inválido" }));
  return { app, lineas };
}

const tokenDe = (rol) => jwt.sign({ sub: "usuario-1", rol, tenantId: "academia-1" }, process.env.JWT_SECRET);

describe("SEG-07 H-02 · Registro de peticiones y eventos de seguridad (OWASP A09)", () => {
  test("CP-088 · un login fallido queda como evento de seguridad sin guardar el correo ni la contraseña", async () => {
    const { app, lineas } = crearApp();
    await request(app).post("/api/auth/login").send({ email: "ana@academia.co", password: "ClaveSecreta123!" });

    expect(lineas).toHaveLength(1);
    expect(lineas[0]).toMatchObject({ evento: "seguridad", nivel: "advertencia", metodo: "POST", ruta: "/api/auth/login", estado: 401 });
    const texto = JSON.stringify(lineas);
    expect(texto).not.toContain("ana@academia.co");
    expect(texto).not.toContain("ClaveSecreta123!");
  });

  test("CP-089 · un acceso negado por rol registra quién lo intentó y de qué academia, pero no el token", async () => {
    const { app, lineas } = crearApp();
    const token = tokenDe("ESTUDIANTE");
    await request(app).get("/api/pagos?desde=2026-10-01").set("Authorization", `Bearer ${token}`);

    expect(lineas[0]).toMatchObject({
      evento: "seguridad",
      ruta: "/api/pagos",
      estado: 403,
      usuario: "usuario-1",
      rol: "ESTUDIANTE",
      academia: "academia-1",
    });
    expect(JSON.stringify(lineas)).not.toContain(token);
  });

  test("CP-090 · una petición normal queda como info, y la consulta de salud no se registra", async () => {
    const { app, lineas } = crearApp();
    await request(app).get("/api/health");
    await request(app).get("/api/pagos").set("Authorization", `Bearer ${tokenDe("ADMIN")}`);

    expect(lineas).toHaveLength(1);
    expect(lineas[0]).toMatchObject({ evento: "peticion", nivel: "info", estado: 200 });
    expect(typeof lineas[0].ms).toBe("number");
  });
});
