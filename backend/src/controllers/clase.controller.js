const prisma = require("../config/prisma");
const notificaciones = require("../utils/notificaciones");
const { validarDatosDeClase } = require("../utils/validaciones");

// RF-14: el administrador de academia programa una clase asignando ritmo,
// salón, profesor, cupo y horario. RN-02 (salón sin cruce) y RN-03
// (profesor sin cruce) se validan antes de crear, dentro de la misma
// academia (req.db ya viene aislado por tenant).
async function crear(req, res) {
  const { ritmoId, salonId, profesorId, cupoMaximo } = req.body;

  const { error, inicio, fin } = validarDatosDeClase(req.body);
  if (error) return res.status(400).json({ error });

  const errorRecursos = await errorEnRecursosDeClase(req, { ritmoId, salonId, profesorId, cupoMaximo });
  if (errorRecursos) return res.status(400).json({ error: errorRecursos });

  const cruce = await cruceDeHorario(req.db, { salonId, profesorId, inicio, fin });
  if (cruce) return res.status(409).json({ error: cruce });

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

// Que el profesor, el salón y el ritmo existan en esta academia y que el cupo
// quepa en el salón. Devuelve el mensaje de error o null.
async function errorEnRecursosDeClase(req, { ritmoId, salonId, profesorId, cupoMaximo }) {
  // El profesor vive en la tabla users, que no está en el cliente aislado por
  // tenant (ver tenantPrismaClient.js), así que se valida a mano que sea de
  // esta academia y tenga el rol correcto.
  const profesor = await prisma.user.findUnique({ where: { id: profesorId } });
  if (!profesor || profesor.tenantId !== req.user.tenantId || profesor.rol !== "PROFESOR") {
    return "El profesor indicado no pertenece a esta academia.";
  }

  const [salon, ritmo] = await Promise.all([
    req.db.salon.findUnique({ where: { id: salonId } }),
    req.db.ritmo.findUnique({ where: { id: ritmoId } }),
  ]);
  if (!salon) return "El salón indicado no existe en esta academia.";
  if (!ritmo) return "El ritmo indicado no existe en esta academia.";
  if (cupoMaximo > salon.capacidad) return `El cupo (${cupoMaximo}) supera la capacidad del salón (${salon.capacidad}).`;
  return null;
}

// RN-02 y RN-03. Dos franjas se cruzan si una empieza antes de que la otra
// termine, en ambos sentidos. Devuelve el mensaje del cruce o null.
async function cruceDeHorario(db, { salonId, profesorId, inicio, fin }) {
  const programadaEnLaFranja = { estado: "PROGRAMADA", fechaHoraInicio: { lt: fin }, fechaHoraFin: { gt: inicio } };

  if (await db.clase.findFirst({ where: { salonId, ...programadaEnLaFranja } })) {
    return "El salón ya tiene una clase programada en ese horario (RN-02).";
  }
  if (await db.clase.findFirst({ where: { profesorId, ...programadaEnLaFranja } })) {
    return "El profesor ya está asignado a otra clase en ese horario (RN-03).";
  }
  return null;
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

// Al cancelar una clase que todavía no empieza se avisa por correo a los
// estudiantes con reserva confirmada (OE-6). Cancelar una clase ya cancelada
// no vuelve a avisar, y una clase que ya pasó no avisa a nadie.
async function cancelar(req, res) {
  const { id } = req.params;

  const antes = await req.db.clase.findUnique({ where: { id }, include: { ritmo: true, salon: true } });
  if (!antes) {
    return res.status(404).json({ error: "Clase no encontrada en esta academia." });
  }
  if (antes.estado === "CANCELADA") {
    const { ritmo, salon, ...clase } = antes;
    return res.json(clase);
  }

  const clase = await req.db.clase.update({ where: { id }, data: { estado: "CANCELADA" } });
  if (antes.fechaHoraInicio > new Date()) {
    await notificaciones.avisarClaseCancelada(req.db, antes);
  }
  res.json(clase);
}

module.exports = { crear, listar, cancelar };
