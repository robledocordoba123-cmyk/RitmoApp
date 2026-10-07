const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");
const { normalizarEmail, passwordValida, LONGITUD_MINIMA_PASSWORD } = require("../utils/validaciones");

const SALT_ROUNDS = 10;

function emitirToken(user) {
  return jwt.sign(
    { sub: user.id, rol: user.rol, tenantId: user.tenantId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
  );
}

// RF-01: registro autónomo de una academia + su administrador inicial.
async function onboarding(req, res) {
  const { academia, admin } = req.body;

  if (!academia?.nombre || !academia?.nit || !admin?.nombre || !admin?.email || !admin?.password) {
    return res.status(400).json({ error: "Faltan datos de la academia o del administrador." });
  }
  if (!passwordValida(admin.password)) {
    return res.status(400).json({ error: `La contraseña debe tener al menos ${LONGITUD_MINIMA_PASSWORD} caracteres.` });
  }

  const emailAdmin = normalizarEmail(admin.email);

  const [nitExistente, correoExistente] = await Promise.all([
    prisma.tenant.findUnique({ where: { nit: academia.nit } }),
    prisma.user.findUnique({ where: { email: emailAdmin } }),
  ]);

  if (nitExistente) {
    return res.status(409).json({ error: "Ya existe una academia registrada con ese NIT." });
  }
  if (correoExistente) {
    return res.status(409).json({ error: "Ya existe un usuario registrado con ese correo." });
  }

  const passwordHash = await bcrypt.hash(admin.password, SALT_ROUNDS);

  const { tenant, usuarioAdmin } = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: { nombre: academia.nombre, nit: academia.nit },
    });

    const usuarioAdmin = await tx.user.create({
      data: {
        tenantId: tenant.id,
        nombre: admin.nombre,
        email: emailAdmin,
        passwordHash,
        rol: "ADMIN_ACADEMIA",
      },
    });

    return { tenant, usuarioAdmin };
  });

  const token = emitirToken(usuarioAdmin);

  return res.status(201).json({
    mensaje: "Academia registrada correctamente.",
    tenant: { id: tenant.id, nombre: tenant.nombre, nit: tenant.nit },
    token,
    // Misma forma que devuelve /login, para que el frontend guarde la
    // sesión de manera consistente sin importar por cuál de las dos rutas
    // haya entrado el usuario.
    usuario: { id: usuarioAdmin.id, nombre: usuarioAdmin.nombre, rol: usuarioAdmin.rol, tenantId: usuarioAdmin.tenantId },
  });
}

// RF-04: autenticación de cualquier rol.
async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Correo y contraseña son obligatorios." });
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizarEmail(email) },
    include: { tenant: true },
  });

  if (!user || !user.activo) {
    return res.status(401).json({ error: "Credenciales inválidas." });
  }

  if (user.tenant && user.tenant.estado !== "ACTIVA") {
    return res.status(401).json({ error: "La academia asociada a este usuario está suspendida." });
  }

  const passwordValida = await bcrypt.compare(password, user.passwordHash);
  if (!passwordValida) {
    return res.status(401).json({ error: "Credenciales inválidas." });
  }

  const token = emitirToken(user);

  return res.json({
    token,
    usuario: { id: user.id, nombre: user.nombre, rol: user.rol, tenantId: user.tenantId },
  });
}

module.exports = { onboarding, login };
