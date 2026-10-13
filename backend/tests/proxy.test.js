const request = require("supertest");

// Cada prueba carga la app con sus propias variables de entorno.
function cargarApp(env) {
  jest.resetModules();
  Object.assign(process.env, env);
  return require("../src/app");
}

afterEach(() => {
  delete process.env.TRUST_PROXY;
  delete process.env.DIAGNOSTICO_IP;
});

describe("RNF-07 · SEG-07 H-01: IP real del usuario detrás de proxies", () => {
  test("CP-086 · con TRUST_PROXY=2 toma la IP del usuario y no la del proxy intermedio", async () => {
    const app = cargarApp({ TRUST_PROXY: "2", DIAGNOSTICO_IP: "true" });
    const res = await request(app).get("/api/diagnostico/ip").set("X-Forwarded-For", "181.50.10.20, 172.68.1.1");

    expect(res.status).toBe(200);
    expect(res.body.ip).toBe("181.50.10.20");
  });

  test("CP-087 · la ruta de diagnóstico no existe si no se activa", async () => {
    const app = cargarApp({});
    expect((await request(app).get("/api/diagnostico/ip")).status).toBe(404);
  });
});
