const { Router } = require("express");
const { requireAuth, requireRole } = require("../middlewares/auth");
const usuarioController = require("../controllers/usuario.controller");

const router = Router();

router.use(requireAuth, requireRole("ADMIN_ACADEMIA"));

router.get("/", usuarioController.listarPorRol);

module.exports = router;
