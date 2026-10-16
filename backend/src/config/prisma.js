const { PrismaClient } = require("../../generated/prisma");
const { PrismaPg } = require("@prisma/adapter-pg");

// Cliente único de Prisma para toda la API, conectado a PostgreSQL con el
// adaptador pg. Las rutas de una academia no lo usan directo: usan req.db, la
// versión filtrada por academia de tenantPrismaClient.js (RN-04).
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

module.exports = prisma;
