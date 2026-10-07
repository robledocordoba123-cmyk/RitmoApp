const prisma = require("../config/prisma");

// RF-02 y RF-03: el SuperAdmin SaaS gestiona el estado global de las academias.
// Opera sobre el modelo Tenant directamente (no está en el cliente aislado
// por tenant: el SuperAdmin no pertenece a ninguna academia).

async function listarTenants(req, res) {
  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { usuarios: true } } },
  });
  res.json(tenants);
}

async function cambiarEstadoTenant(req, res) {
  const { id } = req.params;
  const { estado } = req.body;

  if (!["ACTIVA", "SUSPENDIDA"].includes(estado)) {
    return res.status(400).json({ error: "estado debe ser ACTIVA o SUSPENDIDA." });
  }

  try {
    const tenant = await prisma.tenant.update({ where: { id }, data: { estado } });
    res.json(tenant);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Academia no encontrada." });
    }
    throw err;
  }
}

module.exports = { listarTenants, cambiarEstadoTenant };
