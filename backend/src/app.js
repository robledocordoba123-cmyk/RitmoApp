const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const routes = require("./routes");

const app = express();

// Render (y casi cualquier hosting) pone un proxy delante de la app: sin esto,
// el rate limit vería la IP del proxy y bloquearía a todos los usuarios juntos.
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// Cabeceras HTTP de seguridad (X-Content-Type-Options, HSTS, etc.).
app.use(helmet());

// En desarrollo el frontend usa el proxy de Vite, así que no hace falta CORS.
// En producción solo se aceptan peticiones desde los orígenes listados en
// CORS_ORIGIN (separados por coma), p. ej. la URL del frontend en Vercel.
const origenesPermitidos = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origen) => origen.trim())
  .filter(Boolean);
app.use(cors(origenesPermitidos.length > 0 ? { origin: origenesPermitidos } : {}));

app.use(express.json({ limit: "100kb" }));

app.use("/api", routes);

// Manejador de errores centralizado: evita que un error sin capturar tumbe el proceso
// y sirve para no repetir try/catch de respuesta en cada controlador.
app.use((err, req, res, next) => {
  // JSON mal formado en el body: es un error del cliente, no del servidor.
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "El cuerpo de la petición no es un JSON válido." });
  }
  console.error(err);
  res.status(500).json({ error: "Error interno del servidor." });
});

module.exports = app;
