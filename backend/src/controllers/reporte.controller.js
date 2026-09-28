// RF-08: reporte de ocupación por salón en un rango de fechas. Devuelve los
// datos listos para graficar (porcentaje de ocupación por salón); el
// frontend decide cómo dibujarlos cuando exista.

async function ocupacionPorSalon(req, res) {
  const { desde, hasta } = req.query;

  if (!desde || !hasta) {
    return res.status(400).json({ error: "Los parámetros desde y hasta son obligatorios (formato YYYY-MM-DD)." });
  }

  const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;
  if (!FORMATO_FECHA.test(desde) || !FORMATO_FECHA.test(hasta)) {
    return res.status(400).json({ error: "Las fechas deben tener el formato YYYY-MM-DD." });
  }

  // Las fechas llegan como días de calendario en Colombia (UTC-5, sin horario
  // de verano). "hasta" es inclusivo: el rango termina al inicio del día
  // siguiente. Antes new Date("2026-09-30") era medianoche UTC y dejaba por
  // fuera todas las clases del último día, incluida la de hoy.
  const inicio = new Date(`${desde}T00:00:00-05:00`);
  const finExclusivo = new Date(`${hasta}T00:00:00-05:00`);
  finExclusivo.setUTCDate(finExclusivo.getUTCDate() + 1);
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(finExclusivo.getTime()) || inicio >= finExclusivo) {
    return res.status(400).json({ error: "El rango de fechas no es válido." });
  }

  const clases = await req.db.clase.findMany({
    where: {
      // Una clase cancelada no ofertó cupos: contarla bajaba el porcentaje.
      estado: { not: "CANCELADA" },
      fechaHoraInicio: { gte: inicio, lt: finExclusivo },
    },
    include: {
      salon: { select: { id: true, nombre: true } },
      _count: { select: { reservas: { where: { estado: "CONFIRMADA" } } } },
    },
  });

  const porSalon = new Map();
  for (const clase of clases) {
    if (!porSalon.has(clase.salonId)) {
      porSalon.set(clase.salonId, {
        salonId: clase.salonId,
        salon: clase.salon.nombre,
        totalClases: 0,
        capacidadOfertada: 0,
        reservasConfirmadas: 0,
      });
    }
    const acumulado = porSalon.get(clase.salonId);
    acumulado.totalClases += 1;
    acumulado.capacidadOfertada += clase.cupoMaximo;
    acumulado.reservasConfirmadas += clase._count.reservas;
  }

  const reporte = Array.from(porSalon.values())
    .map((s) => ({
      ...s,
      porcentajeOcupacion:
        s.capacidadOfertada === 0 ? 0 : Math.round((s.reservasConfirmadas / s.capacidadOfertada) * 1000) / 10,
    }))
    .sort((a, b) => b.porcentajeOcupacion - a.porcentajeOcupacion);

  res.json({ desde, hasta, salones: reporte });
}

module.exports = { ocupacionPorSalon };
