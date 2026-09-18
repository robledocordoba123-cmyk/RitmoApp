const { Router } = require("express");
const { requireAuth, requireRole } = require("../middlewares/auth");
const { requireTenant } = require("../middlewares/tenant");
const reservaController = require("../controllers/reserva.controller");

const router = Router();

router.use(requireAuth, requireRole("ESTUDIANTE"), requireTenant);

router.post("/", reservaController.reservar);
router.get("/mias", reservaController.misReservas);

module.exports = router;
