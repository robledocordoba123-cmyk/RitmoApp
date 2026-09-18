const { Router } = require("express");
const { requireAuth, requireRole } = require("../middlewares/auth");
const superadminController = require("../controllers/superadmin.controller");

const router = Router();

// Sin requireTenant a propósito: el SuperAdmin no pertenece a ninguna academia.
router.use(requireAuth, requireRole("SUPERADMIN"));

router.get("/tenants", superadminController.listarTenants);
router.patch("/tenants/:id/estado", superadminController.cambiarEstadoTenant);

module.exports = router;
