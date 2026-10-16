const { Router } = require("express");
const { requireAuth, requireRole } = require("../middlewares/auth");
const { requireTenant } = require("../middlewares/tenant");

const router = Router();

const LIMITE = 200;

// RF-21 · HU-21: el administrador consulta los últimos movimientos de su
// academia. req.db ya filtra por tenant (RN-04), así que nunca ve los de otra.
router.get("/", requireAuth, requireRole("ADMIN_ACADEMIA"), requireTenant, async (req, res) => {
  const movimientos = await req.db.bitacora.findMany({
    orderBy: { fecha: "desc" },
    take: LIMITE,
    select: {
      id: true,
      accion: true,
      detalle: true,
      fecha: true,
      usuario: { select: { nombre: true, rol: true } },
    },
  });
  res.json(movimientos);
});

module.exports = router;
