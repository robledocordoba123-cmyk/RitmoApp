const crypto = require("crypto");
const { Router } = require("express");
const prisma = require("../config/prisma");
const { enviarRecordatoriosDeClase, avisarMembresiasPorVencer } = require("../utils/notificaciones");

const router = Router();

// Tareas programadas (OE-6). No las llama ninguna persona: las llama el
// workflow .github/workflows/tareas-diarias.yml con la clave TAREAS_TOKEN,
// que solo conocen GitHub (secreto) y Render (variable de entorno). Si la
// clave no está configurada, la ruta no existe (404).
function exigirTokenDeTareas(req, res, next) {
  const esperado = process.env.TAREAS_TOKEN;
  if (!esperado) return res.status(404).json({ error: "Ruta no encontrada." });

  const recibido = (req.get("Authorization") || "").replace(/^Bearer /, "");
  const a = Buffer.from(recibido);
  const b = Buffer.from(esperado);
  // timingSafeEqual: comparar en tiempo constante para no dar pistas de la clave.
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: "No autorizado." });
  }
  next();
}

router.post("/diarias", exigirTokenDeTareas, async (req, res) => {
  const recordatorios = await enviarRecordatoriosDeClase(prisma);
  const avisosMembresia = await avisarMembresiasPorVencer(prisma);
  res.json({ recordatorios, avisosMembresia });
});

module.exports = router;
