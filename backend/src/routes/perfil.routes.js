const { Router } = require("express");
const { requireAuth } = require("../middlewares/auth");
const perfilController = require("../controllers/perfil.controller");

const router = Router();

// RF-07 · HU-07: el perfil propio. Sirve para cualquier rol con sesión activa.
router.use(requireAuth);

router.get("/", perfilController.obtener);
router.patch("/", perfilController.actualizar);

module.exports = router;
