// RN-05: la membresía de un estudiante está vigente mientras el mayor
// vigenteHasta de sus pagos esté en el futuro. No se guarda un "estado" en
// la tabla de usuarios: se calcula siempre desde los pagos, así nunca puede
// quedar desincronizado.

const UN_DIA_MS = 24 * 60 * 60 * 1000;

// db debe ser el cliente aislado por tenant (req.db o una transacción suya).
async function estadoMembresia(db, estudianteId, ahora = new Date()) {
  const ultimo = await db.pago.findFirst({
    where: { estudianteId },
    orderBy: { vigenteHasta: "desc" },
    select: { vigenteHasta: true },
  });

  return calcularEstado(ultimo ? ultimo.vigenteHasta : null, ahora);
}

function calcularEstado(vigenteHasta, ahora = new Date()) {
  if (!vigenteHasta) {
    return { estado: "SIN_PAGOS", vigenteHasta: null, diasRestantes: 0 };
  }
  const restante = vigenteHasta.getTime() - ahora.getTime();
  return {
    estado: restante > 0 ? "AL_DIA" : "VENCIDA",
    vigenteHasta,
    diasRestantes: restante > 0 ? Math.ceil(restante / UN_DIA_MS) : 0,
  };
}

// Un pago nuevo extiende la membresía desde donde termina la actual; si ya
// estaba vencida (o nunca hubo pagos), empieza a contar desde hoy. Así quien
// paga por adelantado no pierde los días que le quedaban.
function calcularVigencia(vigenteHastaActual, duracionDias, ahora = new Date()) {
  const desde = vigenteHastaActual && vigenteHastaActual > ahora ? vigenteHastaActual : ahora;
  const hasta = new Date(desde.getTime() + duracionDias * UN_DIA_MS);
  return { vigenteDesde: desde, vigenteHasta: hasta };
}

module.exports = { estadoMembresia, calcularEstado, calcularVigencia, UN_DIA_MS };
