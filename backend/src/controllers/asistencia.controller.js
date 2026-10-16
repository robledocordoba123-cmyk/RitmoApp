// RF-16 · HU-16: el profesor registra asistencia. Mezcla dos restricciones:
// de permiso (solo el profesor asignado a la clase) y de tiempo (solo el día
// de la clase, no antes ni después).

// "El día de la clase" es el día en Colombia, no en UTC. Comparar con
// getUTCDate() fallaba en las clases de la noche: una clase de 6:00 p. m.
// en Bogotá (UTC-5) ya es "mañana" en UTC a partir de las 7:00 p. m., así que
// el profesor no podía registrar la asistencia al terminar la clase.
const ZONA_HORARIA = process.env.TZ_ACADEMIAS || "America/Bogota";
const formatoFecha = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_HORARIA });

function esMismoDia(fechaA, fechaB) {
  return formatoFecha.format(fechaA) === formatoFecha.format(fechaB);
}

async function listarInscritos(req, res) {
  const { id: claseId } = req.params;

  const clase = await req.db.clase.findUnique({ where: { id: claseId } });
  if (!clase) {
    return res.status(404).json({ error: "Clase no encontrada en esta academia." });
  }
  if (clase.profesorId !== req.user.id) {
    return res.status(403).json({ error: "Solo el profesor asignado a esta clase puede ver la lista de inscritos." });
  }

  const reservas = await req.db.reserva.findMany({
    where: { claseId, estado: "CONFIRMADA" },
    include: { estudiante: { select: { id: true, nombre: true, email: true } } },
    // En orden alfabético, como una lista para llamar a lista.
    orderBy: { estudiante: { nombre: "asc" } },
  });
  const asistencias = await req.db.asistencia.findMany({ where: { claseId } });
  const asistenciaPorEstudiante = new Map(asistencias.map((a) => [a.estudianteId, a.estado]));

  const inscritos = reservas.map((r) => ({
    estudianteId: r.estudiante.id,
    nombre: r.estudiante.nombre,
    email: r.estudiante.email,
    estadoAsistencia: asistenciaPorEstudiante.get(r.estudiante.id) || null,
  }));

  res.json(inscritos);
}

async function registrar(req, res) {
  const { id: claseId } = req.params;
  const { asistencias } = req.body;

  if (!Array.isArray(asistencias) || asistencias.length === 0) {
    return res.status(400).json({ error: "asistencias debe ser una lista con al menos un registro." });
  }

  const ESTADOS_VALIDOS = ["ASISTIO", "INASISTENCIA", "EXCUSA"];
  for (const item of asistencias) {
    if (!item.estudianteId || !ESTADOS_VALIDOS.includes(item.estado)) {
      return res.status(400).json({ error: "Cada registro necesita estudianteId y un estado válido (ASISTIO, INASISTENCIA, EXCUSA)." });
    }
  }

  const clase = await req.db.clase.findUnique({ where: { id: claseId } });
  if (!clase) {
    return res.status(404).json({ error: "Clase no encontrada en esta academia." });
  }
  if (clase.profesorId !== req.user.id) {
    return res.status(403).json({ error: "Solo el profesor asignado a esta clase puede registrar asistencia." });
  }
  if (!esMismoDia(clase.fechaHoraInicio, new Date())) {
    return res.status(400).json({ error: "La asistencia solo se puede registrar el día de la clase." });
  }

  const inscritos = await req.db.reserva.findMany({
    where: { claseId, estado: "CONFIRMADA" },
    select: { estudianteId: true },
  });
  const estudiantesInscritos = new Set(inscritos.map((r) => r.estudianteId));

  const noInscritos = asistencias.filter((a) => !estudiantesInscritos.has(a.estudianteId));
  if (noInscritos.length > 0) {
    return res.status(400).json({ error: "Uno o más estudiantes no tienen reserva confirmada en esta clase." });
  }

  const resultado = await req.db.$transaction(
    asistencias.map((item) =>
      req.db.asistencia.upsert({
        where: { claseId_estudianteId: { claseId, estudianteId: item.estudianteId } },
        update: { estado: item.estado, registradoPorId: req.user.id, registradoEn: new Date() },
        create: {
          claseId,
          estudianteId: item.estudianteId,
          estado: item.estado,
          registradoPorId: req.user.id,
        },
      })
    )
  );

  res.json(resultado);
}

// RF-11 · HU-11: historial de asistencia del estudiante. Une sus reservas
// confirmadas de clases que ya empezaron con la asistencia que registró el
// profesor; si el profesor todavía no la registró, el estado queda en null
// ("Sin registrar"). req.db y el filtro por estudianteId hacen que nadie vea
// el historial de otro estudiante ni de otra academia (RN-04).
async function miHistorial(req, res) {
  const estudianteId = req.user.id;
  const [reservas, asistencias] = await Promise.all([
    req.db.reserva.findMany({
      where: { estudianteId, estado: "CONFIRMADA", clase: { fechaHoraInicio: { lte: new Date() }, estado: { not: "CANCELADA" } } },
      include: { clase: { include: { ritmo: true, salon: true, profesor: { select: { nombre: true } } } } },
    }),
    req.db.asistencia.findMany({ where: { estudianteId } }),
  ]);
  const estadoPorClase = new Map(asistencias.map((a) => [a.claseId, a.estado]));

  const registros = reservas
    .map((r) => ({
      claseId: r.clase.id,
      ritmo: r.clase.ritmo.nombre,
      salon: r.clase.salon.nombre,
      profesor: r.clase.profesor.nombre,
      fechaHoraInicio: r.clase.fechaHoraInicio,
      estado: estadoPorClase.get(r.clase.id) || null,
    }))
    .sort((a, b) => b.fechaHoraInicio - a.fechaHoraInicio);

  const contar = (estado) => registros.filter((r) => r.estado === estado).length;
  const resumen = { asistio: contar("ASISTIO"), inasistencia: contar("INASISTENCIA"), excusa: contar("EXCUSA"), sinRegistrar: contar(null) };
  const registradas = resumen.asistio + resumen.inasistencia + resumen.excusa;
  // El porcentaje solo cuenta las clases con asistencia registrada: una clase
  // que el profesor no ha marcado no debe bajar el porcentaje del estudiante.
  resumen.porcentajeAsistencia = registradas === 0 ? null : Math.round((resumen.asistio * 100) / registradas);

  res.json({ resumen, registros });
}

module.exports = { listarInscritos, registrar, miHistorial };
