// HU-22: el administrador genera, consulta o apaga el código de invitación de
// su academia. Generar uno nuevo reemplaza al anterior, que deja de servir.
const prisma = require("../config/prisma");
const { generarCodigo, vigente, DIAS_VIGENCIA } = require("../utils/invitacion");

const CAMPOS = { codigoInvitacion: true, codigoInvitacionVenceEn: true };

function respuesta(tenant) {
  return {
    codigo: tenant.codigoInvitacion,
    venceEn: tenant.codigoInvitacionVenceEn,
    vigente: vigente(tenant),
  };
}

async function obtener(req, res) {
  const tenant = await prisma.tenant.findUnique({ where: { id: req.user.tenantId }, select: CAMPOS });
  if (!tenant) return res.status(404).json({ error: "Academia no encontrada." });
  res.json(respuesta(tenant));
}

async function generar(req, res) {
  const venceEn = new Date(Date.now() + DIAS_VIGENCIA * 24 * 60 * 60 * 1000);
  // El código es único entre todas las academias; si por azar ya existe, se
  // intenta con otro (con 32^8 combinaciones casi nunca pasa).
  for (let intento = 0; intento < 5; intento += 1) {
    try {
      const tenant = await prisma.tenant.update({
        where: { id: req.user.tenantId },
        data: { codigoInvitacion: generarCodigo(), codigoInvitacionVenceEn: venceEn },
        select: CAMPOS,
      });
      return res.status(201).json(respuesta(tenant));
    } catch (err) {
      if (err.code !== "P2002") throw err;
    }
  }
  return res.status(500).json({ error: "No se pudo generar un código. Intenta de nuevo." });
}

async function desactivar(req, res) {
  const tenant = await prisma.tenant.update({
    where: { id: req.user.tenantId },
    data: { codigoInvitacion: null, codigoInvitacionVenceEn: null },
    select: CAMPOS,
  });
  res.json(respuesta(tenant));
}

module.exports = { obtener, generar, desactivar };
