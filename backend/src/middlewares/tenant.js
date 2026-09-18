const { forTenant } = require("../config/tenantPrismaClient");

// Va siempre después de requireAuth. Adjunta req.db: un cliente de Prisma que
// ya trae el tenantId del usuario autenticado incorporado en cada consulta
// (RNF-01, RN-04). Los controladores de recursos de una academia deben usar
// req.db, nunca el cliente crudo, para los modelos multi-tenant.
function requireTenant(req, res, next) {
  if (!req.user || !req.user.tenantId) {
    return res.status(403).json({ error: "Esta acción requiere un usuario asociado a una academia." });
  }
  req.db = forTenant(req.user.tenantId);
  next();
}

module.exports = { requireTenant };
