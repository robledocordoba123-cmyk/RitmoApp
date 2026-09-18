const { Router } = require("express");
const authRoutes = require("./auth.routes");
const salonRoutes = require("./salon.routes");
const ritmoRoutes = require("./ritmo.routes");

const router = Router();

router.get("/health", (req, res) => res.json({ estado: "ok" }));
router.use("/auth", authRoutes);
router.use("/salones", salonRoutes);
router.use("/ritmos", ritmoRoutes);

module.exports = router;
