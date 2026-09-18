const { Router } = require("express");
const { requireAuth, requireRole } = require("../middlewares/auth");
const { requireTenant } = require("../middlewares/tenant");
const claseController = require("../controllers/clase.controller");

const router = Router();

router.use(requireAuth, requireTenant);

// Cualquier rol autenticado de la academia puede ver el catálogo de clases.
router.get("/", claseController.listar);

// Solo el administrador de la academia programa o cancela clases.
router.post("/", requireRole("ADMIN_ACADEMIA"), claseController.crear);
router.patch("/:id/cancelar", requireRole("ADMIN_ACADEMIA"), claseController.cancelar);

module.exports = router;
