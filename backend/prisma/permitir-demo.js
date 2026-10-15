// Los seeds crean cuentas con la contraseña de prueba (incluido un SuperAdmin)
// y el de demo borra y recarga la agenda de Ritmo Central. En la instalación de
// una academia real eso no puede pasar por accidente (SEG-07, condición 3).
//
// En producción solo corren si se pide de forma explícita con --permitir-demo,
// como hace `npm run start:demo` en la demo pública. En local y en las pruebas
// corren como siempre.
function exigirPermisoDeDemo(nombreScript) {
  if (process.env.NODE_ENV === "production" && !process.argv.includes("--permitir-demo")) {
    console.error(
      `${nombreScript}: no se cargan datos de demostración en producción. ` +
        "Para la demo pública usa `npm run start:demo`; para una academia real usa " +
        "`npm run start:produccion` y crea el SuperAdmin con `npm run crear:superadmin`."
    );
    process.exit(1);
  }
}

module.exports = { exigirPermisoDeDemo };
