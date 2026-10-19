const { PrismaClient } = require("../../generated/prisma");
const { PrismaPg } = require("@prisma/adapter-pg");

// Cliente único de Prisma para toda la API, conectado a PostgreSQL con el
// adaptador pg. Casi todas las rutas de una academia usan req.db, la versión
// filtrada por academia de tenantPrismaClient.js (RN-04); donde se usa este
// cliente directo (por ejemplo usuarios) se filtra a mano por tenantId.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

module.exports = prisma;
