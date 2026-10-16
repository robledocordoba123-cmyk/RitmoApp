// Notificaciones por correo que salen en el momento de una acción (OE-6 del
// acta: que el estudiante no se entere de los cambios por WhatsApp ni al
// llegar al salón). Los correos se envían sin esperar la respuesta del
// servidor de correo: si Brevo falla o tarda, la acción del usuario (cancelar
// la clase, registrar el pago) ya quedó hecha y no se revierte por eso.
const correo = require("./correo");

const ZONA_HORARIA = process.env.TZ_ACADEMIAS || "America/Bogota";
const FECHA_HORA = new Intl.DateTimeFormat("es-CO", { dateStyle: "full", timeStyle: "short", timeZone: ZONA_HORARIA });
const FECHA = new Intl.DateTimeFormat("es-CO", { dateStyle: "long", timeZone: ZONA_HORARIA });
const PESOS = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const MEDIOS = { EFECTIVO: "efectivo", TRANSFERENCIA: "transferencia", TARJETA: "tarjeta", OTRO: "otro medio" };

// Los nombres los escribió un usuario: se escapan antes de meterlos en el HTML.
function escaparHtml(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function enviarSinEsperar(mensaje) {
  correo.enviarCorreo(mensaje).catch((err) => {
    console.error(JSON.stringify({ fecha: new Date().toISOString(), nivel: "error", evento: "correo", asunto: mensaje.asunto, error: err.message }));
  });
}

// RF-14 · HU-14: cuando el administrador cancela una clase que todavía no
// empieza, se avisa a cada estudiante con reserva confirmada. Devuelve cuántos
// avisos se enviaron.
async function avisarClaseCancelada(db, clase) {
  const reservas = await db.reserva.findMany({
    where: { claseId: clase.id, estado: "CONFIRMADA" },
    include: { estudiante: { select: { nombre: true, email: true, activo: true } } },
  });
  const cuando = FECHA_HORA.format(clase.fechaHoraInicio);
  const nombreClase = `${clase.ritmo.nombre} en ${clase.salon.nombre}`;

  const destinatarios = reservas.map((r) => r.estudiante).filter((e) => e.activo);
  for (const e of destinatarios) {
    enviarSinEsperar({
      para: e.email,
      asunto: `Clase cancelada: ${clase.ritmo.nombre}, ${cuando}`,
      texto:
        `Hola, ${e.nombre}.\n\nLa academia canceló la clase de ${nombreClase} del ${cuando}, en la que tenías cupo.\n` +
        "Puedes reservar otra clase desde el catálogo de RitmoApp.",
      html:
        `<p>Hola, ${escaparHtml(e.nombre)}.</p>` +
        `<p>La academia <b>canceló</b> la clase de <b>${escaparHtml(nombreClase)}</b> del ${cuando}, en la que tenías cupo.</p>` +
        "<p>Puedes reservar otra clase desde el catálogo de RitmoApp.</p>",
    });
  }
  return destinatarios.length;
}

// RF-19 · HU-19: comprobante del pago que registró la academia, con la fecha
// hasta la que queda vigente la membresía (RN-05).
function enviarComprobantePago(pago, estudiante) {
  const valor = PESOS.format(pago.monto);
  const hasta = FECHA.format(pago.vigenteHasta);
  const medio = MEDIOS[pago.medio] || pago.medio;
  enviarSinEsperar({
    para: estudiante.email,
    asunto: `Pago registrado: ${pago.nombreTarifa} (${valor})`,
    texto:
      `Hola, ${estudiante.nombre}.\n\nTu academia registró tu pago de ${pago.nombreTarifa} por ${valor} (${medio}).\n` +
      `Tu membresía queda vigente hasta el ${hasta}. Ya puedes reservar tus clases.`,
    html:
      `<p>Hola, ${escaparHtml(estudiante.nombre)}.</p>` +
      `<p>Tu academia registró tu pago de <b>${escaparHtml(pago.nombreTarifa)}</b> por <b>${valor}</b> (${medio}).</p>` +
      `<p>Tu membresía queda vigente hasta el <b>${hasta}</b>. Ya puedes reservar tus clases.</p>`,
  });
}

module.exports = { avisarClaseCancelada, enviarComprobantePago };
