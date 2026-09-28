const { Router } = require("express");
const { onboarding, login } = require("../controllers/auth.controller");
const { limiteLogin, limiteRegistro } = require("../middlewares/rateLimit");

const router = Router();

router.post("/onboarding", limiteRegistro, onboarding);
router.post("/login", limiteLogin, login);

module.exports = router;
