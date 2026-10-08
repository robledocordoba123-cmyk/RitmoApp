const { Router } = require("express");
const { requireAuth, requireRole } = require("../middlewares/auth");
const { requireTenant } = require("../middlewares/tenant");
const tarifaController = require("../controllers/tarifa.controller");

const router = Router();

router.use(requireAuth, requireRole("ADMIN_ACADEMIA"), requireTenant);

router.get("/", tarifaController.listar);
router.post("/", tarifaController.crear);
router.put("/:id", tarifaController.actualizar);
router.delete("/:id", tarifaController.eliminar);

module.exports = router;
