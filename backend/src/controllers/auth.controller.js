const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");
const { normalizarEmail, passwordValida, LONGITUD_MINIMA_PASSWORD } = require("../utils/validaciones");
const { datosDeAutorizacion } = require("../utils/privacidad");
const { crearEnlace, enviarEnlace } = require("./confirmacion.controller");

const SALT_ROUNDS = 10;

function emitirToken(user) {
  return jwt.sign(
    { sub: user.id, rol: user.rol, tenantId: user.tenantId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
  );
}

// RF-01: registro autónomo de una academia + su administrador inicial.
// RF-06 · HU-06: la cuenta queda pendiente hasta que el administrador abra el
// enlace que le llega al correo; por eso aquí ya no se devuelve token.
async function onboarding(req, res) {
  const { academia, admin } = req.body;

  if (!academia?.nombre || !academia?.nit || !admin?.nombre || !admin?.email || !admin?.password) {
    return res.status(400).json({ error: "Faltan datos de la academia o del administrador." });
  }
  if (!passwordValida(admin.password)) {
    return res.status(400).json({ error: `La contraseña debe tener al menos ${LONGITUD_MINIMA_PASSWORD} caracteres.` });
  }
  // Ley 1581: la academia no se crea si su administrador no acepta la
  // política de tratamiento de datos. Debe ser true explícito, no "algo".
  if (req.body.aceptaPoliticaDatos !== true) {
    return res.status(400).json({ error: "Debes aceptar la política de tratamiento de datos para registrar la academia." });
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

  const { tenant, usuarioAdmin, enlace } = await prisma.$transaction(async (tx) => {
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
        confirmacionPendiente: true,
        ...datosDeAutorizacion(),
      },
    });
    const enlace = await crearEnlace(usuarioAdmin, tx);

    return { tenant, usuarioAdmin, enlace };
  });

  enviarEnlace(usuarioAdmin, enlace);

  return res.status(201).json({
    mensaje: "Academia registrada. Te enviamos un correo para confirmar tu cuenta.",
    tenant: { id: tenant.id, nombre: tenant.nombre, nit: tenant.nit },
    confirmacionPendiente: true,
    email: usuarioAdmin.email,
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

  // HU-06-CA-02: se revisa después de la contraseña, así solo el dueño de la
  // cuenta se entera de que le falta confirmar el correo.
  if (user.confirmacionPendiente) {
    return res.status(403).json({
      error: "Confirma tu correo antes de iniciar sesión. Busca el enlace que te enviamos o pide uno nuevo.",
      codigo: "CORREO_SIN_CONFIRMAR",
    });
  }

  const token = emitirToken(user);

  return res.json({
    token,
    usuario: { id: user.id, nombre: user.nombre, rol: user.rol, tenantId: user.tenantId },
  });
}

module.exports = { onboarding, login };
