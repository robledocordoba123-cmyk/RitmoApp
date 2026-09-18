const { Router } = require("express");
const { onboarding, login } = require("../controllers/auth.controller");

const router = Router();

router.post("/onboarding", onboarding);
router.post("/login", login);

module.exports = router;
