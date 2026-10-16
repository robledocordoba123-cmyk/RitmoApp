const { Router } = require("express");
const { requireAuth, requireRole } = require("../middlewares/auth");
const { requireTenant } = require("../middlewares/tenant");
const reporteController = require("../controllers/reporte.controller");

const router = Router();

// RF-20 · HU-20: reportes de la academia. Solo el administrador, y siempre
// con los datos de su propia academia (requireTenant).
router.use(requireAuth, requireRole("ADMIN_ACADEMIA"), requireTenant);

router.get("/ocupacion", reporteController.ocupacionPorSalon);
router.get("/ingresos", reporteController.ingresos);

module.exports = router;
