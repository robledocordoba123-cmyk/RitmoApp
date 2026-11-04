// HU-22: códigos de invitación con los que los estudiantes se registran solos
// en su academia. Son de 8 caracteres sin letras ni números que se confundan
// (sin I, O, 0 ni 1) para que se puedan dictar o copiar de una cartelera.
const crypto = require("crypto");

const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const LONGITUD = 8;
const DIAS_VIGENCIA = 30;

function generarCodigo() {
  const bytes = crypto.randomBytes(LONGITUD);
  return Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join("");
}

// Acepta el código con minúsculas, espacios o guiones ("abcd-2345").
function normalizarCodigo(codigo) {
  if (typeof codigo !== "string") return "";
  return codigo.toUpperCase().replace(/[\s-]/g, "");
}

function vigente(tenant, ahora = new Date()) {
  return Boolean(tenant?.codigoInvitacion && tenant.codigoInvitacionVenceEn && tenant.codigoInvitacionVenceEn > ahora);
}

module.exports = { generarCodigo, normalizarCodigo, vigente, DIAS_VIGENCIA, LONGITUD };
