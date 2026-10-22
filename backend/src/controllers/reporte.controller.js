// RF-20 · HU-20: reportes de ocupación por salón, de ingresos y de asistencia
// en un rango de fechas. Los cálculos están en utils/reportes.js, que también
// usa el asistente de IA (RF-23); aquí solo se validan las fechas y se responde.
const reportes = require("../utils/reportes");

async function ocupacionPorSalon(req, res) {
  const { desde, hasta } = req.query;
  const rango = reportes.rangoDeFechas(req.query);
  if (rango.error) return res.status(400).json({ error: rango.error });

  res.json({ desde, hasta, salones: await reportes.ocupacionPorSalon(req.db, rango) });
}

async function ingresos(req, res) {
  const { desde, hasta } = req.query;
  const rango = reportes.rangoDeFechas(req.query);
  if (rango.error) return res.status(400).json({ error: rango.error });

  res.json({ desde, hasta, ...(await reportes.ingresos(req.db, rango)) });
}

async function asistencia(req, res) {
  const { desde, hasta } = req.query;
  const rango = reportes.rangoDeFechas(req.query);
  if (rango.error) return res.status(400).json({ error: rango.error });

  res.json({ desde, hasta, ...(await reportes.asistencia(req.db, rango)) });
}

module.exports = { ocupacionPorSalon, ingresos, asistencia };
