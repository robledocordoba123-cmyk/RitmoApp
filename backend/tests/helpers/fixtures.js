const bcrypt = require("bcryptjs");
const { randomUUID } = require("crypto");
const { prisma } = require("./db");
const { normalizarEmail } = require("../../src/utils/validaciones");

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
  const usuario = await prisma.user.create({
    data: {
      tenantId,
      nombre: overrides.nombre || `Usuario ${rol}`,
      // Igual que la app: el correo siempre se guarda normalizado.
      email: normalizarEmail(overrides.email || `${rol.toLowerCase()}-${randomUUID()}@test.com`),
      passwordHash,
      rol,
      activo: overrides.activo ?? true,
    },
  });

  // Los estudiantes nacen con membresía vigente (RN-05) para que las pruebas
  // de reserva, asistencia y reportes sigan probando lo suyo. Las pruebas de
  // membresía piden { membresia: false } para empezar sin pagos.
  if (rol === "ESTUDIANTE" && tenantId && overrides.membresia !== false) {
    await darMembresia(tenantId, usuario.id);
  }
  return usuario;
}

async function crearTarifa(tenantId, overrides = {}) {
  return prisma.tarifa.create({
    data: {
      tenantId,
      nombre: overrides.nombre || "Mensualidad",
      valor: overrides.valor ?? 120000,
      duracionDias: overrides.duracionDias ?? 30,
      activa: overrides.activa ?? true,
    },
  });
}

// Crea un pago directo en BD con la vigencia indicada (por defecto 30 días
// desde hoy). Sirve para preparar estudiantes al día o vencidos.
async function darMembresia(tenantId, estudianteId, { vigenteHasta } = {}) {
  const tarifa = (await prisma.tarifa.findFirst({ where: { tenantId } })) || (await crearTarifa(tenantId));
  const admin = await prisma.user.findFirst({ where: { tenantId } });
  const hasta = vigenteHasta || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  return prisma.pago.create({
    data: {
      tenantId,
      estudianteId,
      tarifaId: tarifa.id,
      nombreTarifa: tarifa.nombre,
      monto: tarifa.valor,
      duracionDias: tarifa.duracionDias,
      medio: "EFECTIVO",
      vigenteDesde: new Date(hasta.getTime() - tarifa.duracionDias * 24 * 60 * 60 * 1000),
      vigenteHasta: hasta,
      registradoPorId: admin.id,
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

module.exports = { crearAcademia, crearUsuario, crearSalon, crearRitmo, crearTarifa, darMembresia, PASSWORD_PLANA };
