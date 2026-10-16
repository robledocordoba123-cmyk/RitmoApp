// Asistencia con código QR (mejora de T6, complementa RF-16 · HU-16).
// El estudiante muestra en su celular un QR de su reserva y el profesor lo
// escanea: la asistencia queda en "Asistió" sin pasar lista a mano.
//
// El QR lleva un token firmado (JWT), no un id suelto: así nadie puede
// fabricar un código para otra persona. Se firma con una clave derivada de
// JWT_SECRET pero distinta, para que un QR nunca sirva como token de sesión
// (ni un token de sesión como QR).
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const AUDIENCIA = "ritmoapp-asistencia-qr";
const ZONA_HORARIA = process.env.TZ_ACADEMIAS || "America/Bogota";
const DIA = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_HORARIA });
// El profesor puede escanear desde media hora antes de que empiece la clase.
const MINUTOS_ANTES = 30;

function claveQr() {
  return crypto.createHash("sha256").update(`${process.env.JWT_SECRET}:asistencia-qr`).digest();
}

function esMismoDia(a, b) {
  return DIA.format(a) === DIA.format(b);
}

// Fin del día de la clase en Colombia (UTC-5): el QR vence ahí.
function finDelDia(fecha) {
  const inicio = new Date(`${DIA.format(fecha)}T00:00:00-05:00`);
  return new Date(inicio.getTime() + 24 * 60 * 60 * 1000);
}

// GET /api/qr/reservas/:id: el estudiante pide el QR de su reserva. Solo se
// entrega el día de la clase, si la reserva sigue confirmada y la clase no se
// canceló.
async function codigoDeReserva(req, res) {
  const reserva = await req.db.reserva.findUnique({
    where: { id: req.params.id },
    include: { clase: { include: { ritmo: true } } },
  });
  // Una reserva de otro estudiante se trata igual que una que no existe.
  if (!reserva || reserva.estudianteId !== req.user.id) {
    return res.status(404).json({ error: "Reserva no encontrada." });
  }
  if (reserva.estado !== "CONFIRMADA" || reserva.clase.estado === "CANCELADA") {
    return res.status(400).json({ error: "Esta reserva no está activa." });
  }
  const ahora = new Date();
  if (!esMismoDia(reserva.clase.fechaHoraInicio, ahora)) {
    return res.status(400).json({ error: "El código QR se activa el día de la clase." });
  }

  const vence = finDelDia(reserva.clase.fechaHoraInicio);
  // El código lleva solo la reserva y el vencimiento: mientras más corto, más
  // fácil de leer con la cámara. Clase, estudiante y academia se consultan en
  // la base de datos al escanear.
  const codigo = jwt.sign({ sub: reserva.id }, claveQr(), {
    audience: AUDIENCIA,
    expiresIn: Math.max(60, Math.floor((vence - ahora) / 1000)),
    noTimestamp: true,
  });
  res.json({ codigo, clase: reserva.clase.ritmo.nombre, fechaHoraInicio: reserva.clase.fechaHoraInicio, vence });
}

// POST /api/qr/clases/:id/asistencia { codigo }: el profesor escanea un QR en
// su clase. Las reglas son las mismas de registrar a mano (profesor asignado,
// día de la clase) más las del código (firmado, vigente, de esta clase, de
// esta academia y con la reserva todavía confirmada). La reserva se busca con
// req.db: si es de otra academia, no aparece.
async function registrarPorQr(req, res) {
  const { id: claseId } = req.params;
  const { codigo } = req.body || {};

  let datos;
  try {
    datos = jwt.verify(String(codigo || ""), claveQr(), { audience: AUDIENCIA });
  } catch {
    return res.status(400).json({ error: "Código QR no válido o vencido." });
  }

  const clase = await req.db.clase.findUnique({ where: { id: claseId } });
  if (!clase) {
    return res.status(404).json({ error: "Clase no encontrada en esta academia." });
  }
  if (clase.profesorId !== req.user.id) {
    return res.status(403).json({ error: "Solo el profesor asignado a esta clase puede registrar su asistencia." });
  }
  if (clase.estado === "CANCELADA") {
    return res.status(400).json({ error: "La clase está cancelada." });
  }
  const reserva = await req.db.reserva.findUnique({
    where: { id: datos.sub },
    include: { estudiante: { select: { id: true, nombre: true } } },
  });
  if (!reserva || reserva.claseId !== claseId) {
    return res.status(400).json({ error: "Este código QR es de otra clase." });
  }
  if (reserva.estado !== "CONFIRMADA") {
    return res.status(400).json({ error: "La reserva de este código ya no está activa." });
  }

  const ahora = new Date();
  const desde = new Date(clase.fechaHoraInicio.getTime() - MINUTOS_ANTES * 60 * 1000);
  if (!esMismoDia(clase.fechaHoraInicio, ahora) || ahora < desde) {
    return res.status(400).json({ error: `Solo se puede escanear el día de la clase, desde ${MINUTOS_ANTES} minutos antes de que empiece.` });
  }

  const anterior = await req.db.asistencia.findUnique({
    where: { claseId_estudianteId: { claseId, estudianteId: reserva.estudianteId } },
  });
  await req.db.asistencia.upsert({
    where: { claseId_estudianteId: { claseId, estudianteId: reserva.estudianteId } },
    update: { estado: "ASISTIO", registradoPorId: req.user.id, registradoEn: ahora },
    create: { claseId, estudianteId: reserva.estudianteId, estado: "ASISTIO", registradoPorId: req.user.id },
  });

  res.json({ estudiante: reserva.estudiante, estado: "ASISTIO", yaEstabaRegistrado: anterior?.estado === "ASISTIO" });
}

module.exports = { codigoDeReserva, registrarPorQr, AUDIENCIA };
