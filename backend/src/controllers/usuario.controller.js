const bcrypt = require("bcryptjs");
const prisma = require("../config/prisma");
const { normalizarEmail, passwordValida, LONGITUD_MINIMA_PASSWORD } = require("../utils/validaciones");

const SALT_ROUNDS = 10;

// Necesario para que el admin pueda elegir un profesor al programar una
// clase (RF-14). users no está en el cliente aislado por tenant (ver
// tenantPrismaClient.js), así que se filtra a mano por tenantId.
async function listarPorRol(req, res) {
  const { rol } = req.query;
  const ROLES_CONSULTABLES = ["PROFESOR", "ESTUDIANTE"];

  if (!ROLES_CONSULTABLES.includes(rol)) {
    return res.status(400).json({ error: "rol debe ser PROFESOR o ESTUDIANTE." });
  }

  const usuarios = await prisma.user.findMany({
    where: { tenantId: req.user.tenantId, rol, activo: true },
    select: { id: true, nombre: true, email: true, rol: true, createdAt: true },
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

module.exports = { listarPorRol, crear };
