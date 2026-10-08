const prisma = require("../../src/config/prisma");

// Orden que respeta las llaves foráneas: primero lo que depende de una
// clase o de un usuario, al final tenant (de quien todo depende).
async function limpiarBD() {
  await prisma.pago.deleteMany();
  await prisma.tarifa.deleteMany();
  await prisma.asistencia.deleteMany();
  await prisma.reserva.deleteMany();
  await prisma.clase.deleteMany();
  await prisma.salon.deleteMany();
  await prisma.ritmo.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();
}

module.exports = { limpiarBD, prisma };
