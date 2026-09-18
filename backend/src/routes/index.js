const { Router } = require("express");
const authRoutes = require("./auth.routes");

const router = Router();

router.get("/health", (req, res) => res.json({ estado: "ok" }));
router.use("/auth", authRoutes);

module.exports = router;
