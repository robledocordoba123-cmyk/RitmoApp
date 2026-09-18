// Datos de prueba mínimos para desarrollar sin tener que crear todo a mano cada vez.
// RNF-05: el entorno debe poder reconstruirse completo con migraciones + este seed.
require("dotenv/config");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("../generated/prisma");
const { PrismaPg } = require("@prisma/adapter-pg");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash("Prueba123!", 10);

  // No hay endpoint público para crear un SuperAdmin (RF-03): por seguridad,
  // solo se puede crear por seed o directamente en base de datos.
  const superadmin = await prisma.user.upsert({
    where: { email: "superadmin@ritmoapp.test" },
    update: {},
    create: {
      tenantId: null,
      nombre: "SuperAdmin RitmoApp",
      email: "superadmin@ritmoapp.test",
      passwordHash,
      rol: "SUPERADMIN",
    },
  });

  const academia = await prisma.tenant.upsert({
    where: { nit: "900123456-1" },
    update: {},
    create: { nombre: "Academia Ritmo Central", nit: "900123456-1" },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@ritmocentral.test" },
    update: {},
    create: {
      tenantId: academia.id,
      nombre: "Admin Ritmo Central",
      email: "admin@ritmocentral.test",
      passwordHash,
      rol: "ADMIN_ACADEMIA",
    },
  });

  const profesor = await prisma.user.upsert({
    where: { email: "profesor@ritmocentral.test" },
    update: {},
    create: {
      tenantId: academia.id,
      nombre: "Profe Salsa",
      email: "profesor@ritmocentral.test",
      passwordHash,
      rol: "PROFESOR",
    },
  });

  const estudiante = await prisma.user.upsert({
    where: { email: "estudiante@ritmocentral.test" },
    update: {},
    create: {
      tenantId: academia.id,
      nombre: "Estudiante Demo",
      email: "estudiante@ritmocentral.test",
      passwordHash,
      rol: "ESTUDIANTE",
    },
  });

  const salon = await prisma.salon.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      tenantId: academia.id,
      nombre: "Salón 1",
      capacidad: 20,
    },
  });

  const ritmo = await prisma.ritmo.upsert({
    where: { id: "00000000-0000-0000-0000-000000000002" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000002",
      tenantId: academia.id,
      nombre: "Salsa",
    },
  });

  console.log("Seed listo:");
  console.log({ superadmin: superadmin.email, academia: academia.nit, admin: admin.email, profesor: profesor.email, estudiante: estudiante.email, salon: salon.nombre, ritmo: ritmo.nombre });
  console.log('Contraseña de prueba para los cuatro usuarios: "Prueba123!"');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
