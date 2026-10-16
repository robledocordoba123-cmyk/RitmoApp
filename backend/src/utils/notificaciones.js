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

// ── Tarea diaria (la llama GitHub Actions a las 7:00 a. m. de Colombia) ──

const DIAS_AVISO_MEMBRESIA = 3;
const UN_DIA_MS = 24 * 60 * 60 * 1000;
const DIA_ISO = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_HORARIA });

// Inicio y fin de un día de Colombia (UTC-5, sin horario de verano), a "dias"
// de hoy. Sirve para buscar "las clases de mañana" sin depender de la hora UTC.
function rangoDelDia(ahora, dias) {
  const fecha = DIA_ISO.format(new Date(ahora.getTime() + dias * UN_DIA_MS));
  const inicio = new Date(`${fecha}T00:00:00-05:00`);
  return { fecha, inicio, fin: new Date(inicio.getTime() + UN_DIA_MS) };
}

// Anota la notificación antes de enviarla. Si la clave ya existía (la tarea
// corrió dos veces el mismo día), Prisma lanza P2002 y no se envía de nuevo.
async function primeraVez(prisma, clave) {
  try {
    await prisma.notificacionEnviada.create({ data: { clave } });
    return true;
  } catch (err) {
    if (err.code === "P2002") return false;
    throw err;
  }
}

// Recordatorio a cada estudiante con reserva confirmada en una clase de
// mañana. Usa el cliente global de Prisma: la tarea recorre todas las
// academias activas, cada correo va solo al estudiante de esa reserva.
async function enviarRecordatoriosDeClase(prisma, ahora = new Date()) {
  const { inicio, fin } = rangoDelDia(ahora, 1);
  const reservas = await prisma.reserva.findMany({
    where: {
      estado: "CONFIRMADA",
      estudiante: { activo: true },
      tenant: { estado: "ACTIVA" },
      clase: { estado: "PROGRAMADA", fechaHoraInicio: { gte: inicio, lt: fin } },
    },
    include: { estudiante: { select: { nombre: true, email: true } }, clase: { include: { ritmo: true, salon: true } } },
  });

  let enviados = 0;
  for (const r of reservas) {
    if (!(await primeraVez(prisma, `recordatorio:${r.claseId}:${r.estudianteId}`))) continue;
    const cuando = FECHA_HORA.format(r.clase.fechaHoraInicio);
    const nombreClase = `${r.clase.ritmo.nombre} en ${r.clase.salon.nombre}`;
    enviarSinEsperar({
      para: r.estudiante.email,
      asunto: `Mañana tienes clase: ${r.clase.ritmo.nombre}`,
      texto: `Hola, ${r.estudiante.nombre}.

Te recordamos que el ${cuando} tienes clase de ${nombreClase}.
Si no puedes ir, cancela tu reserva en RitmoApp para que otra persona use el cupo.`,
      html:
        `<p>Hola, ${escaparHtml(r.estudiante.nombre)}.</p>` +
        `<p>Te recordamos que el <b>${cuando}</b> tienes clase de <b>${escaparHtml(nombreClase)}</b>.</p>` +
        "<p>Si no puedes ir, cancela tu reserva en RitmoApp para que otra persona use el cupo.</p>",
    });
    enviados += 1;
  }
  return enviados;
}

// RN-05 · HU-13: aviso a los estudiantes cuya membresía vence dentro de
// DIAS_AVISO_MEMBRESIA días, para que paguen antes de quedarse sin reservar.
async function avisarMembresiasPorVencer(prisma, ahora = new Date()) {
  const { fecha, inicio, fin } = rangoDelDia(ahora, DIAS_AVISO_MEMBRESIA);
  const ultimos = await prisma.pago.groupBy({ by: ["estudianteId"], _max: { vigenteHasta: true } });
  const porVencer = ultimos.filter((u) => u._max.vigenteHasta >= inicio && u._max.vigenteHasta < fin);
  if (porVencer.length === 0) return 0;

  const estudiantes = await prisma.user.findMany({
    where: { id: { in: porVencer.map((u) => u.estudianteId) }, activo: true, rol: "ESTUDIANTE", tenant: { estado: "ACTIVA" } },
    select: { id: true, nombre: true, email: true },
  });

  let enviados = 0;
  for (const e of estudiantes) {
    if (!(await primeraVez(prisma, `membresia:${e.id}:${fecha}`))) continue;
    const hasta = FECHA.format(porVencer.find((u) => u.estudianteId === e.id)._max.vigenteHasta);
    enviarSinEsperar({
      para: e.email,
      asunto: "Tu membresía vence en 3 días",
      texto: `Hola, ${e.nombre}.

Tu membresía en la academia vence el ${hasta}. Renuévala en la academia para seguir reservando tus clases sin interrupciones.`,
      html:
        `<p>Hola, ${escaparHtml(e.nombre)}.</p>` +
        `<p>Tu membresía en la academia vence el <b>${hasta}</b>.</p>` +
        "<p>Renuévala en la academia para seguir reservando tus clases sin interrupciones.</p>",
    });
    enviados += 1;
  }
  return enviados;
}

module.exports = { avisarClaseCancelada, enviarComprobantePago, enviarRecordatoriosDeClase, avisarMembresiasPorVencer, rangoDelDia };
