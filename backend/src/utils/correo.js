const nodemailer = require("nodemailer");

// Envío de correos por SMTP (sirve con Gmail, Outlook, Brevo, Resend, etc.).
// Se configura con SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS y CORREO_REMITENTE.
// Si no está configurado (desarrollo local), el correo no se envía: se
// muestra en la consola del servidor para poder seguir probando el flujo.
let transporte = null;

function configurado() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function obtenerTransporte() {
  if (!transporte) {
    const puerto = Number(process.env.SMTP_PORT || 587);
    transporte = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: puerto,
      secure: puerto === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporte;
}

async function enviarCorreo({ para, asunto, texto, html }) {
  if (!configurado()) {
    // En producción no se imprime el contenido: puede llevar un enlace de
    // recuperación y los registros del hosting no son un lugar seguro.
    if (process.env.NODE_ENV === "production") {
      console.warn(`[correo] SMTP no configurado: no se envió "${asunto}".`);
    } else if (process.env.NODE_ENV !== "test") {
      console.log(`[correo sin SMTP] Para: ${para}\nAsunto: ${asunto}\n${texto}`);
    }
    return;
  }
  await obtenerTransporte().sendMail({
    from: process.env.CORREO_REMITENTE || process.env.SMTP_USER,
    to: para,
    subject: asunto,
    text: texto,
    html,
  });
}

module.exports = { enviarCorreo };
