// Ley 1581 de 2012 (protección de datos personales): nadie entra a RitmoApp
// sin que conste la autorización para tratar sus datos. Se guarda la fecha y
// la versión de la política aceptada, para saber qué texto autorizó cada
// persona si la política cambia después.
//
// Si se cambia el texto de la política (frontend/src/pages/PrivacidadPage.jsx)
// hay que subir esta versión y la que muestra esa página.
// 1.1 (22/10/2026): se agrega el asistente de IA (envío de datos a Anthropic, EE. UU.).
const VERSION_POLITICA_DATOS = "1.1";

function datosDeAutorizacion() {
  return { autorizacionDatosEn: new Date(), versionPoliticaDatos: VERSION_POLITICA_DATOS };
}

module.exports = { VERSION_POLITICA_DATOS, datosDeAutorizacion };
