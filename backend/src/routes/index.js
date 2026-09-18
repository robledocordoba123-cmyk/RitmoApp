const { Router } = require("express");
const authRoutes = require("./auth.routes");
const salonRoutes = require("./salon.routes");
const ritmoRoutes = require("./ritmo.routes");
const claseRoutes = require("./clase.routes");
const reservaRoutes = require("./reserva.routes");

const router = Router();

router.get("/health", (req, res) => res.json({ estado: "ok" }));
router.use("/auth", authRoutes);
router.use("/salones", salonRoutes);
router.use("/ritmos", ritmoRoutes);
router.use("/clases", claseRoutes);
router.use("/reservas", reservaRoutes);

module.exports = router;
