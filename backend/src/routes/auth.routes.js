const { Router } = require("express");
const { onboarding, login } = require("../controllers/auth.controller");
const { solicitar, restablecer } = require("../controllers/recuperacion.controller");
const { confirmar, reenviar } = require("../controllers/confirmacion.controller");
const { limiteLogin, limiteRegistro, limiteRecuperacion, limiteConfirmacion } = require("../middlewares/rateLimit");

const router = Router();

// Rutas públicas (sin token). Cada una tiene su límite de intentos por IP
// (middlewares/rateLimit.js): registro de academias (HU-01), login (HU-04,
// RNF-07), recuperación de contraseña (HU-05) y confirmación de la cuenta (HU-06).
router.post("/onboarding", limiteRegistro, onboarding);
router.post("/login", limiteLogin, login);
router.post("/recuperar", limiteRecuperacion, solicitar);
router.post("/restablecer", limiteRecuperacion, restablecer);
router.post("/confirmar", limiteConfirmacion, confirmar);
router.post("/reenviar-confirmacion", limiteConfirmacion, reenviar);

module.exports = router;
