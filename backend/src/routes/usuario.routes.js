const { Router } = require("express");
const { requireAuth, requireRole } = require("../middlewares/auth");
const { requireTenant } = require("../middlewares/tenant");
const usuarioController = require("../controllers/usuario.controller");

const router = Router();

// RF-17 · HU-17: profesores y estudiantes de la academia. Solo el
// administrador. Listar y crear filtran por la academia del token en el
// controlador; editar usa además requireTenant para buscar con req.db.
router.use(requireAuth, requireRole("ADMIN_ACADEMIA"));

router.get("/", usuarioController.listarPorRol);
router.post("/", usuarioController.crear);
router.patch("/:id", requireTenant, usuarioController.actualizar);

module.exports = router;
