const { Router } = require("express");
const { requireAuth, requireRole } = require("../middlewares/auth");
const { requireTenant } = require("../middlewares/tenant");
const reservaController = require("../controllers/reserva.controller");

const router = Router();

// RF-09 y RF-10 · HU-09 y HU-10: reservar, ver y cancelar. Solo el estudiante,
// dentro de su academia.
router.use(requireAuth, requireRole("ESTUDIANTE"), requireTenant);

router.post("/", reservaController.reservar);
router.get("/mias", reservaController.misReservas);
router.patch("/:id/cancelar", reservaController.cancelar);

module.exports = router;
