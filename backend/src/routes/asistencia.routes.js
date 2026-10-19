const { Router } = require("express");
const { requireAuth, requireRole } = require("../middlewares/auth");
const { requireTenant } = require("../middlewares/tenant");
const asistenciaController = require("../controllers/asistencia.controller");

const router = Router();

// RF-11 · HU-11: el estudiante consulta su propio historial de asistencia.
// Registrar asistencia es del profesor y está en clase.routes.js.
router.use(requireAuth, requireRole("ESTUDIANTE"), requireTenant);

router.get("/mias", asistenciaController.miHistorial);

module.exports = router;
