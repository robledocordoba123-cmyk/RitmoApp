const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const routes = require("./routes");

const app = express();

// Render pone proxies delante de la app (su balanceador y la red de Cloudflare).
// "trust proxy" dice cuántos saltos de X-Forwarded-For son confiables para
// sacar la IP real del usuario. Si el número es menor que los proxies reales,
// req.ip termina siendo la IP de un proxy que cambia en cada petición y el
// límite de intentos reparte los intentos en varios contadores (hallazgo H-01
// de SEG-07). Se configura con TRUST_PROXY; en producción, por defecto, 1.
const saltosDeProxy = Number.parseInt(process.env.TRUST_PROXY ?? "", 10);
if (!Number.isNaN(saltosDeProxy)) {
  app.set("trust proxy", saltosDeProxy);
} else if (process.env.NODE_ENV === "production") {
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
