// Piezas comunes de los enlaces que se mandan por correo: recuperar la
// contraseña (HU-05) y confirmar la cuenta (HU-06).
const crypto = require("crypto");

// Token de un solo uso para la URL. En la base de datos se guarda solo su
// hash: si alguien leyera la tabla, no podría usar los enlaces pendientes.
function nuevoToken() {
  return crypto.randomBytes(32).toString("hex");
}

function hashDe(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// El nombre lo escribió un usuario: se escapa antes de meterlo en el HTML del correo.
function escaparHtml(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function urlFrontend() {
  const primerOrigen = (process.env.CORS_ORIGIN || "").split(",")[0].trim();
  return process.env.FRONTEND_URL || primerOrigen || "http://localhost:5173";
}

module.exports = { nuevoToken, hashDe, escaparHtml, urlFrontend };
