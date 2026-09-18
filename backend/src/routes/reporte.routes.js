const { Router } = require("express");
const { requireAuth, requireRole } = require("../middlewares/auth");
const { requireTenant } = require("../middlewares/tenant");
const reporteController = require("../controllers/reporte.controller");

const router = Router();

router.use(requireAuth, requireRole("ADMIN_ACADEMIA"), requireTenant);

router.get("/ocupacion", reporteController.ocupacionPorSalon);

module.exports = router;
