const prisma = require("../config/prisma");

// Necesario para que el admin pueda elegir un profesor al programar una
// clase (RF-05). users no está en el cliente aislado por tenant (ver
// tenantPrismaClient.js), así que se filtra a mano por tenantId.
async function listarPorRol(req, res) {
  const { rol } = req.query;
  const ROLES_CONSULTABLES = ["PROFESOR", "ESTUDIANTE"];

  if (!ROLES_CONSULTABLES.includes(rol)) {
    return res.status(400).json({ error: "rol debe ser PROFESOR o ESTUDIANTE." });
  }

  const usuarios = await prisma.user.findMany({
    where: { tenantId: req.user.tenantId, rol, activo: true },
    select: { id: true, nombre: true, email: true },
    orderBy: { nombre: "asc" },
  });

  res.json(usuarios);
}

module.exports = { listarPorRol };
