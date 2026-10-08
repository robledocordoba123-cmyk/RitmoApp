const { Router } = require("express");
const { requireAuth, requireRole } = require("../middlewares/auth");
const { requireTenant } = require("../middlewares/tenant");
const usuarioController = require("../controllers/usuario.controller");

const router = Router();

router.use(requireAuth, requireRole("ADMIN_ACADEMIA"));

router.get("/", usuarioController.listarPorRol);
router.post("/", usuarioController.crear);
router.patch("/:id", requireTenant, usuarioController.actualizar);

module.exports = router;
