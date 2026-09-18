// RF-08: reporte de ocupación por salón en un rango de fechas. Devuelve los
// datos listos para graficar (porcentaje de ocupación por salón); el
// frontend decide cómo dibujarlos cuando exista.

async function ocupacionPorSalon(req, res) {
  const { desde, hasta } = req.query;

  if (!desde || !hasta) {
    return res.status(400).json({ error: "Los parámetros desde y hasta son obligatorios (formato YYYY-MM-DD)." });
  }

  const inicio = new Date(desde);
  const fin = new Date(hasta);
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime()) || inicio > fin) {
    return res.status(400).json({ error: "El rango de fechas no es válido." });
  }

  const clases = await req.db.clase.findMany({
    where: {
      fechaHoraInicio: { gte: inicio },
      fechaHoraFin: { lte: fin },
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
