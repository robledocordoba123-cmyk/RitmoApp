const bcrypt = require("bcryptjs");
const prisma = require("../config/prisma");
const { normalizarEmail, passwordValida, LONGITUD_MINIMA_PASSWORD } = require("../utils/validaciones");

const SALT_ROUNDS = 10;

// Necesario para que el admin pueda elegir un profesor al programar una
// clase (RF-14). users no está en el cliente aislado por tenant (ver
// tenantPrismaClient.js), así que se filtra a mano por tenantId.
async function listarPorRol(req, res) {
  const { rol } = req.query;
  // Por defecto solo los activos (para asignar clases); la pantalla de
  // Equipo pide también los inactivos para poder reactivarlos.
  const incluirInactivos = req.query.incluirInactivos === "true";
  const ROLES_CONSULTABLES = ["PROFESOR", "ESTUDIANTE"];

  if (!ROLES_CONSULTABLES.includes(rol)) {
    return res.status(400).json({ error: "rol debe ser PROFESOR o ESTUDIANTE." });
  }

  const usuarios = await prisma.user.findMany({
    where: { tenantId: req.user.tenantId, rol, ...(incluirInactivos ? {} : { activo: true }) },
    select: { id: true, nombre: true, email: true, rol: true, activo: true, createdAt: true },
    orderBy: { nombre: "asc" },
  });

  res.json(usuarios);
}

// El admin de academia crea profesores y estudiantes de su propia academia.
// No existe autorregistro público para estos roles a propósito: el Alcance
// del proyecto define esto como gestión de usuarios por parte del admin, no
// un estudiante buscando su academia entre muchas.
async function crear(req, res) {
  const { nombre, password, rol } = req.body;
  const email = normalizarEmail(req.body.email);
  const ROLES_CREABLES = ["PROFESOR", "ESTUDIANTE"];

  if (!nombre || !email || !password || !ROLES_CREABLES.includes(rol)) {
    return res.status(400).json({ error: "nombre, email, password y rol (PROFESOR o ESTUDIANTE) son obligatorios." });
  }
  if (!passwordValida(password)) {
    return res.status(400).json({ error: `La contraseña debe tener al menos ${LONGITUD_MINIMA_PASSWORD} caracteres.` });
  }

  const yaExiste = await prisma.user.findUnique({ where: { email } });
  if (yaExiste) {
    return res.status(409).json({ error: "Ya existe un usuario registrado con ese correo." });
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const usuario = await prisma.user.create({
    data: { tenantId: req.user.tenantId, nombre, email, passwordHash, rol },
    select: { id: true, nombre: true, email: true, rol: true, createdAt: true },
  });

  res.status(201).json(usuario);
}

// RF-17 · HU-17: el admin edita el nombre o el correo y activa o desactiva
// a un profesor o estudiante de su academia. No se borra a nadie: el
// historial de reservas, asistencias y pagos debe conservarse.
async function actualizar(req, res) {
  const { id } = req.params;
  const { nombre, activo } = req.body;
  const email = req.body.email === undefined ? undefined : normalizarEmail(req.body.email);

  if (nombre !== undefined && (typeof nombre !== "string" || !nombre.trim())) {
    return res.status(400).json({ error: "El nombre no puede quedar vacío." });
  }
  if (email !== undefined && (typeof email !== "string" || !email.includes("@"))) {
    return res.status(400).json({ error: "El correo no es válido." });
  }
  if (activo !== undefined && typeof activo !== "boolean") {
    return res.status(400).json({ error: "activo debe ser verdadero o falso." });
  }

  // users no está en el cliente aislado por tenant: se filtra a mano. Un
  // admin no puede tocar usuarios de otra academia ni a otros admins.
  const usuario = await prisma.user.findFirst({
    where: { id, tenantId: req.user.tenantId, rol: { in: ["PROFESOR", "ESTUDIANTE"] } },
  });
  if (!usuario) {
    return res.status(404).json({ error: "El usuario no existe en esta academia." });
  }

  if (email && email !== usuario.email) {
    const ocupado = await prisma.user.findUnique({ where: { email } });
    if (ocupado) return res.status(409).json({ error: "Ya existe un usuario registrado con ese correo." });
  }

  const desactivando = activo === false && usuario.activo;
  const ahora = new Date();

  // RN-13: un profesor con clases por dictar no se desactiva; primero hay
  // que reasignar o cancelar esas clases, o quedarían sin profesor.
  if (desactivando && usuario.rol === "PROFESOR") {
    const pendientes = await req.db.clase.count({
      where: { profesorId: id, estado: "PROGRAMADA", fechaHoraInicio: { gt: ahora } },
    });
    if (pendientes > 0) {
      return res.status(409).json({
        error: `No se puede desactivar: tiene ${pendientes === 1 ? "1 clase programada" : `${pendientes} clases programadas`}. Reasígnalas o cancélalas primero.`,
      });
    }
  }

  const actualizado = await req.db.$transaction(async (tx) => {
    // Un estudiante desactivado libera los cupos de sus clases futuras para
    // que otros puedan reservarlos.
    if (desactivando && usuario.rol === "ESTUDIANTE") {
      const reservas = await tx.reserva.findMany({
        where: { estudianteId: id, estado: "CONFIRMADA", clase: { fechaHoraInicio: { gt: ahora } } },
        include: { clase: true },
      });
      for (const r of reservas) {
        await tx.reserva.update({ where: { id: r.id }, data: { estado: "CANCELADA" } });
        if (r.clase.estado === "PROGRAMADA") {
          await tx.clase.update({ where: { id: r.claseId }, data: { cuposDisponibles: { increment: 1 } } });
        }
      }
    }
    return tx.user.update({
      where: { id },
      data: { nombre: nombre?.trim(), email, activo },
      select: { id: true, nombre: true, email: true, rol: true, activo: true, createdAt: true },
    });
  });

  res.json(actualizado);
}

module.exports = { listarPorRol, crear, actualizar };
