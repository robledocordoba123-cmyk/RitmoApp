const { Router } = require("express");
const { requireAuth, requireRole } = require("../middlewares/auth");
const { requireTenant } = require("../middlewares/tenant");
const { limiteAsistente } = require("../middlewares/rateLimit");
const asistenteController = require("../controllers/asistente.controller");

const router = Router();

// RF-23 · HU-24: asistente de IA. Solo el administrador, siempre con los
// datos de su propia academia (requireTenant) y con límite de preguntas.
router.use(requireAuth, requireRole("ADMIN_ACADEMIA"), requireTenant);

router.get("/estado", asistenteController.estado);
router.post("/", limiteAsistente, asistenteController.preguntar);

module.exports = router;
