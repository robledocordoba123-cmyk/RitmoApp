const nodemailer = require("nodemailer");

// Envío de correos. Hay dos formas, en este orden:
// 1. API HTTP de Brevo (BREVO_API_KEY). Es la que se usa en producción:
//    el plan gratuito de Render bloquea los puertos SMTP (25, 465 y 587).
// 2. SMTP (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS), útil en local.
// El remitente sale de CORREO_REMITENTE, con la forma "Nombre <correo>".
// Si no hay ninguna configurada (desarrollo local), el correo no se envía:
// se muestra en la consola del servidor para poder seguir probando el flujo.
let transporte = null;

function smtpConfigurado() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

// "RitmoApp <correo@dominio.com>" → { name: "RitmoApp", email: "correo@dominio.com" }
function remitente() {
  const texto = process.env.CORREO_REMITENTE || process.env.SMTP_USER || "";
  const partes = texto.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return partes ? { name: partes[1] || "RitmoApp", email: partes[2] } : { name: "RitmoApp", email: texto.trim() };
}

async function enviarConBrevo({ para, asunto, texto, html }) {
  const respuesta = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": process.env.BREVO_API_KEY, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ sender: remitente(), to: [{ email: para }], subject: asunto, textContent: texto, htmlContent: html }),
    signal: AbortSignal.timeout(15000),
  });
  if (!respuesta.ok) {
    throw new Error(`Brevo respondió ${respuesta.status}: ${await respuesta.text()}`);
  }
}

function obtenerTransporte() {
  if (!transporte) {
    const puerto = Number(process.env.SMTP_PORT || 587);
    transporte = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: puerto,
      secure: puerto === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      // Si el puerto está bloqueado, falla en segundos y queda en el registro
      // en lugar de esperar los 2 minutos por defecto.
      connectionTimeout: 10000,
    });
  }
  return transporte;
}

async function enviarCorreo({ para, asunto, texto, html }) {
  if (process.env.BREVO_API_KEY) {
    return enviarConBrevo({ para, asunto, texto, html });
  }
  if (!smtpConfigurado()) {
    // En producción no se imprime el contenido: puede llevar un enlace de
    // recuperación y los registros del hosting no son un lugar seguro.
    if (process.env.NODE_ENV === "production") {
      console.warn(`[correo] Envío de correo no configurado: no se envió "${asunto}".`);
    } else if (process.env.NODE_ENV !== "test") {
      console.log(`[correo sin configurar] Para: ${para}\nAsunto: ${asunto}\n${texto}`);
    }
    return;
  }
  const { name, email } = remitente();
  await obtenerTransporte().sendMail({ from: { name, address: email }, to: para, subject: asunto, text: texto, html });
}

module.exports = { enviarCorreo };
