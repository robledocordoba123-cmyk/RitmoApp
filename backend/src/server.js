require("dotenv").config({ quiet: true });

// Sin estas variables la API arranca "bien" pero falla en la primera petición
// (o firma tokens con un secreto vacío). Mejor no arrancar y decir por qué.
const VARIABLES_OBLIGATORIAS = ["DATABASE_URL", "JWT_SECRET"];
const faltantes = VARIABLES_OBLIGATORIAS.filter((nombre) => !process.env[nombre]);
if (faltantes.length > 0) {
  console.error(`Faltan variables de entorno: ${faltantes.join(", ")}. Revisa backend/.env (ver .env.example).`);
  process.exit(1);
}

const app = require("./app");

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`RitmoApp API escuchando en http://localhost:${PORT}`);
});
