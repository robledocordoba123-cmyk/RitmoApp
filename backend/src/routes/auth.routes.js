const { Router } = require("express");
const { onboarding, login } = require("../controllers/auth.controller");
const { solicitar, restablecer } = require("../controllers/recuperacion.controller");
const { limiteLogin, limiteRegistro, limiteRecuperacion } = require("../middlewares/rateLimit");

const router = Router();

router.post("/onboarding", limiteRegistro, onboarding);
router.post("/login", limiteLogin, login);
router.post("/recuperar", limiteRecuperacion, solicitar);
router.post("/restablecer", limiteRecuperacion, restablecer);

module.exports = router;
