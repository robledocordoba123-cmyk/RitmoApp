const { Router } = require("express");
const { onboarding, login } = require("../controllers/auth.controller");
const { solicitar, restablecer } = require("../controllers/recuperacion.controller");
const { limiteLogin, limiteRegistro, limiteRecuperacion } = require("../middlewares/rateLimit");

const router = Router();

// Rutas públicas (sin token). Cada una tiene su límite de intentos por IP
// (middlewares/rateLimit.js): registro de academias (HU-01), login (HU-04,
// RNF-07) y recuperación de contraseña (HU-05).
router.post("/onboarding", limiteRegistro, onboarding);
router.post("/login", limiteLogin, login);
router.post("/recuperar", limiteRecuperacion, solicitar);
router.post("/restablecer", limiteRecuperacion, restablecer);

module.exports = router;
