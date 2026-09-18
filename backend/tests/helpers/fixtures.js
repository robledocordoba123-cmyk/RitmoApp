const bcrypt = require("bcryptjs");
const { randomUUID } = require("crypto");
const { prisma } = require("./db");

const PASSWORD_PLANA = "Prueba123!";

async function crearAcademia(overrides = {}) {
  return prisma.tenant.create({
    data: {
      nombre: overrides.nombre || "Academia de Prueba",
      nit: overrides.nit || `NIT-${randomUUID()}`,
      estado: overrides.estado || "ACTIVA",
    },
  });
}

// rounds bajos (4) a propósito: en producción bcrypt.hash usa 10, pero en los
// tests se llama cientos de veces y no aporta nada probar que bcrypt es lento.
async function crearUsuario(tenantId, rol, overrides = {}) {
  const passwordHash = await bcrypt.hash(overrides.password || PASSWORD_PLANA, 4);
  return prisma.user.create({
    data: {
      tenantId,
      nombre: overrides.nombre || `Usuario ${rol}`,
      email: overrides.email || `${rol.toLowerCase()}-${randomUUID()}@test.com`,
      passwordHash,
      rol,
      activo: overrides.activo ?? true,
    },
  });
}

async function crearSalon(tenantId, overrides = {}) {
  return prisma.salon.create({
    data: {
      tenantId,
      nombre: overrides.nombre || "Salón de Prueba",
      capacidad: overrides.capacidad ?? 20,
    },
  });
}

async function crearRitmo(tenantId, overrides = {}) {
  return prisma.ritmo.create({
    data: { tenantId, nombre: overrides.nombre || "Salsa" },
  });
}

module.exports = { crearAcademia, crearUsuario, crearSalon, crearRitmo, PASSWORD_PLANA };
