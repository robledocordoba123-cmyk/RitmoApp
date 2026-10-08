const prisma = require("../config/prisma");

// RF-14: el administrador de academia programa una clase asignando ritmo,
// salón, profesor, cupo y horario. RN-02 (salón sin cruce) y RN-03
// (profesor sin cruce) se validan antes de crear, dentro de la misma
// academia (req.db ya viene aislado por tenant).
async function crear(req, res) {
  const { ritmoId, salonId, profesorId, cupoMaximo, fechaHoraInicio, fechaHoraFin } = req.body;

  if (!ritmoId || !salonId || !profesorId || !Number.isInteger(cupoMaximo) || cupoMaximo <= 0 || !fechaHoraInicio || !fechaHoraFin) {
    return res.status(400).json({ error: "Faltan datos o son inválidos para crear la clase." });
  }

  const inicio = new Date(fechaHoraInicio);
  const fin = new Date(fechaHoraFin);
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime()) || inicio >= fin) {
    return res.status(400).json({ error: "El rango de fecha/hora de la clase no es válido." });
  }

  // El profesor vive en la tabla users, que no está en el cliente aislado por
  // tenant (ver tenantPrismaClient.js), así que se valida a mano que sea de
  // esta academia y tenga el rol correcto.
  const profesor = await prisma.user.findUnique({ where: { id: profesorId } });
  if (!profesor || profesor.tenantId !== req.user.tenantId || profesor.rol !== "PROFESOR") {
    return res.status(400).json({ error: "El profesor indicado no pertenece a esta academia." });
  }

  const [salon, ritmo] = await Promise.all([
    req.db.salon.findUnique({ where: { id: salonId } }),
    req.db.ritmo.findUnique({ where: { id: ritmoId } }),
  ]);
  if (!salon) return res.status(400).json({ error: "El salón indicado no existe en esta academia." });
  if (!ritmo) return res.status(400).json({ error: "El ritmo indicado no existe en esta academia." });
  if (cupoMaximo > salon.capacidad) {
    return res.status(400).json({ error: `El cupo (${cupoMaximo}) supera la capacidad del salón (${salon.capacidad}).` });
  }

  // Dos franjas se cruzan si una empieza antes de que la otra termine, en ambos sentidos.
  const filtroCruceHorario = { fechaHoraInicio: { lt: fin }, fechaHoraFin: { gt: inicio } };

  const cruceSalon = await req.db.clase.findFirst({
    where: { salonId, estado: "PROGRAMADA", ...filtroCruceHorario },
  });
  if (cruceSalon) {
    return res.status(409).json({ error: "El salón ya tiene una clase programada en ese horario (RN-02)." });
  }

  const cruceProfesor = await req.db.clase.findFirst({
    where: { profesorId, estado: "PROGRAMADA", ...filtroCruceHorario },
  });
  if (cruceProfesor) {
    return res.status(409).json({ error: "El profesor ya está asignado a otra clase en ese horario (RN-03)." });
  }

  const clase = await req.db.clase.create({
    data: {
      ritmoId,
      salonId,
      profesorId,
      cupoMaximo,
      cuposDisponibles: cupoMaximo,
      fechaHoraInicio: inicio,
      fechaHoraFin: fin,
    },
  });

  res.status(201).json(clase);
}

// RF-08 (catálogo): el estudiante consulta las clases con cupos en tiempo real.
// RF-08 · HU-08: filtros opcionales para el catálogo. Sin parámetros
// devuelve todas las clases programadas (lo que usa el administrador).
async function listar(req, res) {
  const { ritmoId, fecha, soloFuturas } = req.query;
  const where = { estado: "PROGRAMADA" };

  if (ritmoId) where.ritmoId = ritmoId;
  if (fecha) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return res.status(400).json({ error: "La fecha debe tener el formato YYYY-MM-DD." });
    }
    // Día de calendario en Colombia (UTC-5, sin horario de verano).
    const inicioDia = new Date(`${fecha}T00:00:00-05:00`);
    if (Number.isNaN(inicioDia.getTime())) {
      return res.status(400).json({ error: "La fecha no es válida." });
    }
    where.fechaHoraInicio = { gte: inicioDia, lt: new Date(inicioDia.getTime() + 24 * 60 * 60 * 1000) };
  }
  if (soloFuturas === "true") {
    where.fechaHoraInicio = { ...where.fechaHoraInicio, gt: new Date() };
  }

  const clases = await req.db.clase.findMany({
    where,
    include: { ritmo: true, salon: true, profesor: { select: { id: true, nombre: true } } },
    orderBy: { fechaHoraInicio: "asc" },
  });
  res.json(clases);
}

async function cancelar(req, res) {
  const { id } = req.params;

  try {
    const clase = await req.db.clase.update({
      where: { id },
      data: { estado: "CANCELADA" },
    });
    res.json(clase);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Clase no encontrada en esta academia." });
    }
    throw err;
  }
}

module.exports = { crear, listar, cancelar };
