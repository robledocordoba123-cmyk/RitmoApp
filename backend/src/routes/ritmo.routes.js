const { Router } = require("express");
const { requireAuth, requireRole } = require("../middlewares/auth");
const { requireTenant } = require("../middlewares/tenant");
const ritmoController = require("../controllers/ritmo.controller");

const router = Router();

router.use(requireAuth, requireRole("ADMIN_ACADEMIA"), requireTenant);

router.get("/", ritmoController.listar);
router.post("/", ritmoController.crear);
router.put("/:id", ritmoController.actualizar);
router.delete("/:id", ritmoController.eliminar);

module.exports = router;
