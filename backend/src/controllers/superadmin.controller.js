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

  const actual = await prisma.tenant.findUnique({ where: { id } });
  if (!actual) {
    return res.status(404).json({ error: "Academia no encontrada." });
  }
  // HU-03-CA-02: si ya está en ese estado se avisa en lugar de "guardar"
  // un cambio que no ocurrió.
  if (actual.estado === estado) {
    return res.status(409).json({
      error: estado === "SUSPENDIDA" ? "Esta academia ya está desactivada." : "Esta academia ya está activa.",
    });
  }

  // RN-06: solo cambia el estado; ningún dato de la academia se borra.
  const tenant = await prisma.tenant.update({ where: { id }, data: { estado } });
  res.json(tenant);
}

module.exports = { listarTenants, cambiarEstadoTenant };
