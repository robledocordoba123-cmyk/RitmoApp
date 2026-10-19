const { Router } = require("express");
const { requireAuth, requireRole } = require("../middlewares/auth");
const { requireTenant } = require("../middlewares/tenant");
const tarifaController = require("../controllers/tarifa.controller");

const router = Router();

// RF-18 · HU-18: tarifas (planes que vende la academia). Solo el
// administrador; una tarifa con pagos no se borra, se desactiva (RN-13).
router.use(requireAuth, requireRole("ADMIN_ACADEMIA"), requireTenant);

router.get("/", tarifaController.listar);
router.post("/", tarifaController.crear);
router.put("/:id", tarifaController.actualizar);
router.delete("/:id", tarifaController.eliminar);

module.exports = router;
