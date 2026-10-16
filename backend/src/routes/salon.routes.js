const { Router } = require("express");
const { requireAuth, requireRole } = require("../middlewares/auth");
const { requireTenant } = require("../middlewares/tenant");
const salonController = require("../controllers/salon.controller");

const router = Router();

// RF-18 · HU-18: salones de la academia. Solo el administrador.
router.use(requireAuth, requireRole("ADMIN_ACADEMIA"), requireTenant);

router.get("/", salonController.listar);
router.post("/", salonController.crear);
router.put("/:id", salonController.actualizar);
router.delete("/:id", salonController.eliminar);

module.exports = router;
