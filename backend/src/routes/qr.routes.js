const { Router } = require("express");
const { requireAuth, requireRole } = require("../middlewares/auth");
const { requireTenant } = require("../middlewares/tenant");
const qrController = require("../controllers/qr.controller");

const router = Router();

// Asistencia con QR: el estudiante pide el código de su reserva y el profesor
// asignado lo escanea en su clase. Todo dentro de la academia (req.db).
router.use(requireAuth, requireTenant);

router.get("/reservas/:id", requireRole("ESTUDIANTE"), qrController.codigoDeReserva);
router.post("/clases/:id/asistencia", requireRole("PROFESOR"), qrController.registrarPorQr);

module.exports = router;
