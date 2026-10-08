// RF-05 · HU-05: recuperar la contraseña con un enlace enviado al correo.
// RN-07: el enlace vence a los 30 minutos y sirve una sola vez.
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const prisma = require("../config/prisma");
const correo = require("../utils/correo");
const { normalizarEmail, passwordValida, LONGITUD_MINIMA_PASSWORD } = require("../utils/validaciones");

const SALT_ROUNDS = 10;
const MINUTOS_VIGENCIA = 30;

// Misma respuesta exista o no el correo: así nadie puede usar este formulario
// para averiguar qué correos están registrados.
const RESPUESTA_SOLICITUD = {
  mensaje: "Si el correo está registrado, te enviamos un enlace para crear una nueva contraseña. Revisa tu bandeja de entrada.",
};

function hashDe(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// El nombre lo escribió un usuario: se escapa antes de meterlo en el HTML del correo.
function escaparHtml(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function urlFrontend() {
  const primerOrigen = (process.env.CORS_ORIGIN || "").split(",")[0].trim();
  return process.env.FRONTEND_URL || primerOrigen || "http://localhost:5173";
}

async function solicitar(req, res) {
  const email = normalizarEmail(req.body.email);
  if (!email) {
    return res.status(400).json({ error: "El correo es obligatorio." });
  }

  const user = await prisma.user.findUnique({ where: { email }, include: { tenant: true } });
  const puedeEntrar = user && user.activo && (!user.tenant || user.tenant.estado === "ACTIVA");
  if (!puedeEntrar) {
    return res.json(RESPUESTA_SOLICITUD);
  }

  const token = crypto.randomBytes(32).toString("hex");
  const ahora = new Date();
  await prisma.$transaction([
    // Pedir un enlace nuevo anula los anteriores que no se hayan usado.
    prisma.tokenRecuperacion.updateMany({
      where: { userId: user.id, usadoEn: null },
      data: { usadoEn: ahora },
    }),
    prisma.tokenRecuperacion.create({
      data: {
        userId: user.id,
        tokenHash: hashDe(token),
        expiraEn: new Date(ahora.getTime() + MINUTOS_VIGENCIA * 60 * 1000),
      },
    }),
  ]);

  const enlace = `${urlFrontend()}/restablecer-contrasena?token=${token}`;
  // Se envía sin esperar la respuesta del servidor de correo: si se esperara,
  // el tiempo de respuesta delataría qué correos existen.
  correo
    .enviarCorreo({
      para: user.email,
      asunto: "Recupera tu contraseña de RitmoApp",
      texto:
        `Hola, ${user.nombre}.\n\nPara crear una nueva contraseña entra a este enlace:\n${enlace}\n\n` +
        `El enlace vence en ${MINUTOS_VIGENCIA} minutos y sirve una sola vez. Si no lo pediste, ignora este correo: tu contraseña no cambia.`,
      html:
        `<p>Hola, ${escaparHtml(user.nombre)}.</p><p>Para crear una nueva contraseña entra a este enlace:</p>` +
        `<p><a href="${enlace}">Crear nueva contraseña</a></p>` +
        `<p>El enlace vence en ${MINUTOS_VIGENCIA} minutos y sirve una sola vez. Si no lo pediste, ignora este correo: tu contraseña no cambia.</p>`,
    })
    .catch((err) => console.error("[correo] No se pudo enviar el enlace de recuperación:", err.message));

  return res.json(RESPUESTA_SOLICITUD);
}

async function restablecer(req, res) {
  const { token, password } = req.body;

  if (typeof token !== "string" || !token) {
    return res.status(400).json({ error: "Falta el token del enlace." });
  }
  // HU-05-CA-03: la nueva contraseña cumple el mismo mínimo que el registro.
  if (!passwordValida(password)) {
    return res.status(400).json({ error: `La contraseña debe tener al menos ${LONGITUD_MINIMA_PASSWORD} caracteres.` });
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const ahora = new Date();

  const cambiada = await prisma.$transaction(async (tx) => {
    // Se marca como usado solo si sigue vigente y sin usar. Es una sola
    // operación condicional: dos peticiones con el mismo enlace no pueden
    // pasar las dos (RN-07, "sirve una sola vez").
    const marcado = await tx.tokenRecuperacion.updateMany({
      where: { tokenHash: hashDe(token), usadoEn: null, expiraEn: { gt: ahora } },
      data: { usadoEn: ahora },
    });
    if (marcado.count === 0) return false;

    const registro = await tx.tokenRecuperacion.findUnique({ where: { tokenHash: hashDe(token) } });
    await tx.user.update({ where: { id: registro.userId }, data: { passwordHash } });
    return true;
  });

  if (!cambiada) {
    return res.status(400).json({ error: "El enlace no es válido o ya venció. Solicita uno nuevo." });
  }
  return res.json({ mensaje: "Tu contraseña se actualizó. Ya puedes iniciar sesión." });
}

module.exports = { solicitar, restablecer, MINUTOS_VIGENCIA };
