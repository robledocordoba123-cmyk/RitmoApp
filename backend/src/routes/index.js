const { Router } = require("express");
const authRoutes = require("./auth.routes");
const salonRoutes = require("./salon.routes");
const ritmoRoutes = require("./ritmo.routes");
const claseRoutes = require("./clase.routes");
const reservaRoutes = require("./reserva.routes");
const superadminRoutes = require("./superadmin.routes");
const reporteRoutes = require("./reporte.routes");
const usuarioRoutes = require("./usuario.routes");
const tarifaRoutes = require("./tarifa.routes");
const pagoRoutes = require("./pago.routes");

const router = Router();

router.get("/health", (req, res) => res.json({ estado: "ok" }));

// Diagnóstico temporal para ajustar TRUST_PROXY: muestra qué IP ve la API.
// Solo existe si DIAGNOSTICO_IP=true; se apaga en cuanto termina el ajuste.
if (process.env.DIAGNOSTICO_IP === "true") {
  router.get("/diagnostico/ip", (req, res) => res.json({ ip: req.ip, cadena: req.ips }));
}
router.use("/auth", authRoutes);
router.use("/salones", salonRoutes);
router.use("/ritmos", ritmoRoutes);
router.use("/clases", claseRoutes);
router.use("/reservas", reservaRoutes);
router.use("/superadmin", superadminRoutes);
router.use("/reportes", reporteRoutes);
router.use("/usuarios", usuarioRoutes);
router.use("/tarifas", tarifaRoutes);
router.use("/pagos", pagoRoutes);

module.exports = router;
