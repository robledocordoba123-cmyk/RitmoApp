const fs = require("fs");
const path = require("path");
const request = require("supertest");
const app = require("../src/app");
const especificacion = require("../src/docs/openapi");

const CARPETA_RUTAS = path.join(__dirname, "../src/routes");
const METODOS = ["get", "post", "put", "patch", "delete"];

// Lee src/routes y arma la lista "MÉTODO /ruta" de todo lo que la API expone.
// Se hace leyendo el código (no la app en marcha) para que una ruta nueva se
// detecte aunque esté detrás de un middleware que exige sesión.
function rutasDelCodigo() {
  const indice = fs.readFileSync(path.join(CARPETA_RUTAS, "index.js"), "utf8");
  const archivoDe = {};
  for (const [, variable, archivo] of indice.matchAll(/const (\w+) = require\("\.\/([\w.]+)"\)/g)) {
    archivoDe[variable] = archivo;
  }

  const rutas = new Set();
  const agregar = (prefijo, codigo) => {
    for (const [, metodo, ruta] of codigo.matchAll(/router\.(get|post|put|patch|delete)\(\s*"([^"]*)"/g)) {
      const completa = `${prefijo}${ruta === "/" ? "" : ruta}`.replace(/:(\w+)/g, "{$1}");
      rutas.add(`${metodo.toUpperCase()} ${completa}`);
    }
  };

  // Rutas definidas en el mismo index.js, menos la de diagnóstico, que es
  // temporal y solo existe si DIAGNOSTICO_IP=true.
  agregar("", indice.replace(/router\.get\("\/diagnostico\/ip"[^\n]*/, ""));

  for (const [, prefijo, variable] of indice.matchAll(/router\.use\("([^"]+)", (\w+)\)/g)) {
    const archivo = path.join(CARPETA_RUTAS, `${archivoDe[variable]}.js`);
    agregar(prefijo, fs.readFileSync(archivo, "utf8"));
  }
  return rutas;
}

function rutasDocumentadas() {
  const rutas = new Set();
  for (const [ruta, operaciones] of Object.entries(especificacion.paths)) {
    for (const metodo of Object.keys(operaciones).filter((m) => METODOS.includes(m))) {
      rutas.add(`${metodo.toUpperCase()} ${ruta}`);
    }
  }
  return rutas;
}

describe("Documentación de la API (OpenAPI / Swagger)", () => {
  test("CP-238 · cada ruta de src/routes está documentada y no se documentan rutas que no existen", () => {
    const codigo = rutasDelCodigo();
    const documentadas = rutasDocumentadas();

    // Si esta prueba falla, falta describir (o sobra) la ruta que sale en el mensaje.
    expect([...codigo].filter((r) => !documentadas.has(r)).sort()).toEqual([]);
    expect([...documentadas].filter((r) => !codigo.has(r)).sort()).toEqual([]);
    expect(codigo.size).toBeGreaterThanOrEqual(50);
  });

  test("CP-239 · todas las referencias ($ref) apuntan a algo que existe", () => {
    const texto = JSON.stringify(especificacion);
    const referencias = [...texto.matchAll(/"\$ref":"#\/components\/(\w+)\/(\w+)"/g)];

    expect(referencias.length).toBeGreaterThan(0);
    for (const [, tipo, nombre] of referencias) {
      expect(especificacion.components[tipo]).toHaveProperty(nombre);
    }
  });

  test("CP-240 · cada operación tiene resumen, etiqueta conocida y al menos una respuesta", () => {
    const etiquetas = new Set(especificacion.tags.map((t) => t.name));
    for (const operaciones of Object.values(especificacion.paths)) {
      for (const operacion of Object.values(operaciones)) {
        expect(operacion.summary).toEqual(expect.any(String));
        expect(etiquetas.has(operacion.tags[0])).toBe(true);
        expect(Object.keys(operacion.responses).length).toBeGreaterThan(0);
      }
    }
  });

  test("CP-241 · GET /api/docs/openapi.json entrega la especificación sin pedir sesión", async () => {
    const res = await request(app).get("/api/docs/openapi.json");

    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe("3.0.3");
    expect(res.body.info.title).toBe("RitmoApp API");
    expect(Object.keys(res.body.paths)).toContain("/auth/login");
  });

  test("CP-242 · GET /api/docs/ muestra la página de Swagger UI", async () => {
    const res = await request(app).get("/api/docs/");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/html/);
    expect(res.text).toContain("swagger-ui");
    expect(res.text).toContain("RitmoApp API");
  });

  test("CP-243 · documentar la API no abre las rutas: sin token siguen respondiendo 401", async () => {
    expect((await request(app).get("/api/salones")).status).toBe(401);
    expect((await request(app).get("/api/pagos")).status).toBe(401);
  });
});
