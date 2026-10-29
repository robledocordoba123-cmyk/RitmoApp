// RF-06 · HU-06: confirmar la cuenta con un enlace enviado al correo.
// Aplica a quien registra una academia (onboarding): hasta que confirme no
// puede iniciar sesión (HU-06-CA-02). El enlace vence a las 24 horas y sirve
// una sola vez; si vence, se pide otro (HU-06-CA-03).
const prisma = require("../config/prisma");
const correo = require("../utils/correo");
const { nuevoToken, hashDe, escaparHtml, urlFrontend } = require("../utils/enlaces");
const { normalizarEmail } = require("../utils/validaciones");

const HORAS_VIGENCIA = 24;

// Misma respuesta exista o no el correo, igual que en la recuperación: el
// formulario de reenvío no sirve para averiguar qué correos están registrados.
const RESPUESTA_REENVIO = {
  mensaje: "Si ese correo tiene una cuenta pendiente de confirmar, te enviamos un enlace nuevo. Revisa tu bandeja de entrada.",
};

// Crea un enlace nuevo (anulando los anteriores sin usar) y lo manda por correo.
// Se puede llamar dentro de una transacción pasando tx; el correo sale aparte,
// sin esperar, para que una falla del servidor de correo no deshaga el registro.
async function crearEnlace(user, tx = prisma) {
  const token = nuevoToken();
  const ahora = new Date();
  await tx.tokenConfirmacion.updateMany({
    where: { userId: user.id, usadoEn: null },
    data: { usadoEn: ahora },
  });
  await tx.tokenConfirmacion.create({
    data: {
      userId: user.id,
      tokenHash: hashDe(token),
      expiraEn: new Date(ahora.getTime() + HORAS_VIGENCIA * 60 * 60 * 1000),
    },
  });
  return token;
}

function enviarEnlace(user, token) {
  const enlace = `${urlFrontend()}/confirmar-cuenta?token=${token}`;
  correo
    .enviarCorreo({
      para: user.email,
      asunto: "Confirma tu cuenta de RitmoApp",
      texto:
        `Hola, ${user.nombre}.\n\nPara activar tu cuenta de RitmoApp entra a este enlace:\n${enlace}\n\n` +
        `El enlace vence en ${HORAS_VIGENCIA} horas y sirve una sola vez. Si no registraste una academia, ignora este correo.`,
      html:
        `<p>Hola, ${escaparHtml(user.nombre)}.</p><p>Para activar tu cuenta de RitmoApp entra a este enlace:</p>` +
        `<p><a href="${enlace}">Confirmar mi cuenta</a></p>` +
        `<p>El enlace vence en ${HORAS_VIGENCIA} horas y sirve una sola vez. Si no registraste una academia, ignora este correo.</p>`,
    })
    .catch((err) => console.error("[correo] No se pudo enviar el enlace de confirmación:", err.message));
}

async function confirmar(req, res) {
  const { token } = req.body;
  if (typeof token !== "string" || !token) {
    return res.status(400).json({ error: "Falta el token del enlace." });
  }

  const ahora = new Date();
  const confirmada = await prisma.$transaction(async (tx) => {
    // Una sola operación condicional: el mismo enlace no puede usarse dos veces.
    const marcado = await tx.tokenConfirmacion.updateMany({
      where: { tokenHash: hashDe(token), usadoEn: null, expiraEn: { gt: ahora } },
      data: { usadoEn: ahora },
    });
    if (marcado.count === 0) return false;

    const registro = await tx.tokenConfirmacion.findUnique({ where: { tokenHash: hashDe(token) } });
    await tx.user.update({
      where: { id: registro.userId },
      data: { confirmacionPendiente: false, correoConfirmadoEn: ahora },
    });
    return true;
  });

  if (!confirmada) {
    return res.status(400).json({ error: "El enlace no es válido o ya venció. Pide uno nuevo." });
  }
  return res.json({ mensaje: "Tu cuenta quedó confirmada. Ya puedes iniciar sesión." });
}

async function reenviar(req, res) {
  const email = normalizarEmail(req.body.email);
  if (!email) {
    return res.status(400).json({ error: "El correo es obligatorio." });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (user && user.activo && user.confirmacionPendiente) {
    const token = await crearEnlace(user);
    enviarEnlace(user, token);
  }
  return res.json(RESPUESTA_REENVIO);
}

module.exports = { confirmar, reenviar, crearEnlace, enviarEnlace, HORAS_VIGENCIA };
