const { Router } = require("express");
const { requireAuth, requireRole } = require("../middlewares/auth");
const { requireTenant } = require("../middlewares/tenant");
const usuarioController = require("../controllers/usuario.controller");

const router = Router();

// RF-17 · HU-17: profesores y estudiantes de la academia. Solo el
// administrador. La tabla de usuarios no está en el cliente aislado por
// academia, así que el controlador filtra a mano por la academia del token.
// Editar usa además requireTenant porque, al desactivar a alguien, revisa sus
// clases y cancela sus reservas con req.db (RN-13).
router.use(requireAuth, requireRole("ADMIN_ACADEMIA"));

router.get("/", usuarioController.listarPorRol);
router.post("/", usuarioController.crear);
router.patch("/:id", requireTenant, usuarioController.actualizar);

module.exports = router;
