// Crea la cuenta SuperAdmin de una instalación real (RF-03: no hay endpoint
// público para esto). Reemplaza al seed, que la crea con la contraseña de prueba.
//
// Uso (una sola vez, después de `npm run start:produccion` o de las migraciones):
//   SUPERADMIN_EMAIL=... SUPERADMIN_PASSWORD=... SUPERADMIN_NOMBRE="..." npm run crear:superadmin
//
// La contraseña se pasa por variable de entorno para que no quede en el
// historial ni en el repositorio, y se guarda solo cifrada con bcrypt.
require("dotenv/config");
const bcrypt = require("bcryptjs");
const { normalizarEmail, passwordValida, LONGITUD_MINIMA_PASSWORD } = require("../src/utils/validaciones");

const SALT_ROUNDS = 10;
const PASSWORD_DE_PRUEBA = "Prueba123!";

async function crearSuperAdmin(prisma, { email, password, nombre = "SuperAdmin RitmoApp" }) {
  const correo = normalizarEmail(email);
  if (!correo || !correo.includes("@")) throw new Error("SUPERADMIN_EMAIL no es un correo válido.");
  if (!passwordValida(password)) throw new Error(`SUPERADMIN_PASSWORD debe tener al menos ${LONGITUD_MINIMA_PASSWORD} caracteres.`);
  if (password === PASSWORD_DE_PRUEBA) throw new Error("SUPERADMIN_PASSWORD no puede ser la contraseña de prueba de la demo.");

  const existente = await prisma.user.findUnique({ where: { email: correo } });
  if (existente) {
    if (existente.rol !== "SUPERADMIN") throw new Error("Ese correo ya pertenece a una cuenta que no es SuperAdmin.");
    // No se cambia la contraseña de una cuenta que ya existe: para eso está "¿Olvidaste tu contraseña?".
    return { creado: false, id: existente.id };
  }

  const usuario = await prisma.user.create({
    data: { tenantId: null, nombre, email: correo, rol: "SUPERADMIN", passwordHash: await bcrypt.hash(password, SALT_ROUNDS) },
  });
  return { creado: true, id: usuario.id };
}

module.exports = { crearSuperAdmin };

if (require.main === module) {
  const prisma = require("../src/config/prisma");
  crearSuperAdmin(prisma, {
    email: process.env.SUPERADMIN_EMAIL,
    password: process.env.SUPERADMIN_PASSWORD,
    nombre: process.env.SUPERADMIN_NOMBRE || undefined,
  })
    .then((r) => console.log(r.creado ? "SuperAdmin creado." : "Ya existía un SuperAdmin con ese correo; no se cambió nada."))
    .catch((err) => {
      console.error(err.message);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
