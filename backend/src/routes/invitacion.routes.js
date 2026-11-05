const { Router } = require("express");
const { requireAuth, requireRole } = require("../middlewares/auth");
const invitacionController = require("../controllers/invitacion.controller");

const router = Router();

// HU-22: el código de invitación de la academia. Solo el administrador.
router.use(requireAuth, requireRole("ADMIN_ACADEMIA"));

router.get("/", invitacionController.obtener);
router.post("/", invitacionController.generar);
router.delete("/", invitacionController.desactivar);

module.exports = router;
