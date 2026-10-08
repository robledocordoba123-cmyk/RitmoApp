// RF-20 · HU-20: reportes de ocupación por salón y de ingresos en un rango
// de fechas. Devuelven los datos listos para graficar o mostrar en tabla.

const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

// Valida desde/hasta y los convierte en un rango [inicio, finExclusivo).
// Devuelve { error } si algo no cuadra.
function rangoDeFechas({ desde, hasta }) {
  if (!desde || !hasta) {
    return { error: "Los parámetros desde y hasta son obligatorios (formato YYYY-MM-DD)." };
  }
  if (!FORMATO_FECHA.test(desde) || !FORMATO_FECHA.test(hasta)) {
    return { error: "Las fechas deben tener el formato YYYY-MM-DD." };
  }

  // Las fechas llegan como días de calendario en Colombia (UTC-5, sin horario
  // de verano). "hasta" es inclusivo: el rango termina al inicio del día
  // siguiente. Antes new Date("2026-09-30") era medianoche UTC y dejaba por
  // fuera todas las clases del último día, incluida la de hoy.
  const inicio = new Date(`${desde}T00:00:00-05:00`);
  const finExclusivo = new Date(`${hasta}T00:00:00-05:00`);
  finExclusivo.setUTCDate(finExclusivo.getUTCDate() + 1);
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(finExclusivo.getTime()) || inicio >= finExclusivo) {
    return { error: "El rango de fechas no es válido." };
  }
  return { inicio, finExclusivo };
}

async function ocupacionPorSalon(req, res) {
  const { desde, hasta } = req.query;
  const { error, inicio, finExclusivo } = rangoDeFechas(req.query);
  if (error) return res.status(400).json({ error });

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

// Suma de los pagos registrados en el rango, por tarifa y por medio de pago.
// Se agrupa por el nombre copiado en el pago, no por la tarifa actual, para
// que renombrar una tarifa no cambie reportes de meses anteriores.
async function ingresos(req, res) {
  const { desde, hasta } = req.query;
  const { error, inicio, finExclusivo } = rangoDeFechas(req.query);
  if (error) return res.status(400).json({ error });

  const rango = { registradoEn: { gte: inicio, lt: finExclusivo } };
  const [porTarifa, porMedio] = await Promise.all([
    req.db.pago.groupBy({ by: ["nombreTarifa"], where: rango, _sum: { monto: true }, _count: { _all: true } }),
    req.db.pago.groupBy({ by: ["medio"], where: rango, _sum: { monto: true }, _count: { _all: true } }),
  ]);

  const resumir = (filas, campo) =>
    filas
      .map((f) => ({ [campo]: f[campo], pagos: f._count._all, total: f._sum.monto || 0 }))
      .sort((a, b) => b.total - a.total);

  const tarifas = resumir(porTarifa, "nombreTarifa");
  res.json({
    desde,
    hasta,
    total: tarifas.reduce((suma, t) => suma + t.total, 0),
    cantidadPagos: tarifas.reduce((suma, t) => suma + t.pagos, 0),
    porTarifa: tarifas,
    porMedio: resumir(porMedio, "medio"),
  });
}

module.exports = { ocupacionPorSalon, ingresos };
