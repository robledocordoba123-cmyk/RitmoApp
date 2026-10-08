const { Router } = require("express");
const { requireAuth, requireRole } = require("../middlewares/auth");
const { requireTenant } = require("../middlewares/tenant");
const pagoController = require("../controllers/pago.controller");

const router = Router();

router.use(requireAuth);

// El estudiante solo ve lo suyo (HU-12-CA-03).
router.get("/mios", requireRole("ESTUDIANTE"), requireTenant, pagoController.misPagos);

router.use(requireRole("ADMIN_ACADEMIA"), requireTenant);
router.get("/", pagoController.listar);
router.post("/", pagoController.registrar);
router.get("/membresias", pagoController.membresias);

module.exports = router;
