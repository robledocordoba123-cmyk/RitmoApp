require("dotenv/config");
const { defineConfig, env } = require("prisma/config");

// El CLI de Prisma (generate, migrate, studio) lee la conexión de aquí.
// La aplicación en tiempo de ejecución usa el adapter en src/config/prisma.js.
module.exports = defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
