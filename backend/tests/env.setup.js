const path = require("path");

// Se ejecuta antes de cargar cualquier archivo de prueba, así que el resto
// del código (incluido src/config/prisma.js) ya ve las variables de .env.test
// cuando construye el cliente de Prisma.
require("dotenv").config({ path: path.resolve(__dirname, "../.env.test"), override: true, quiet: true });
