// RF-07 · HU-07: validación de la foto de perfil. Llega como data URL
// (data:image/...;base64,...). No basta con mirar el prefijo, porque se puede
// escribir a mano: también se revisan los primeros bytes del archivo, que
// identifican de verdad si es JPEG, PNG o WebP.

const FORMATOS_VALIDOS = "JPG, PNG o WebP";
// El frontend reduce la foto a 256 px antes de enviarla (unos 15-40 KB), así
// que 64 KB deja margen y mantiene el cuerpo por debajo del límite de 100 KB.
const TAMANO_MAXIMO_BYTES = 64 * 1024;

const PATRON_DATA_URL = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/;

const FIRMAS = {
  jpeg: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  png: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  webp: (b) => b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP",
};

const MENSAJE_FORMATO = `Formato de imagen no permitido. Usa una foto en ${FORMATOS_VALIDOS}.`;

// Devuelve el mensaje de error o null si la foto sirve.
function errorEnFotoPerfil(foto) {
  if (typeof foto !== "string") return MENSAJE_FORMATO;

  const partes = PATRON_DATA_URL.exec(foto);
  if (!partes) return MENSAJE_FORMATO;

  const [, tipo, base64] = partes;
  const bytes = Buffer.from(base64, "base64");
  if (bytes.length > TAMANO_MAXIMO_BYTES) {
    return "La foto es demasiado pesada. Elige otra imagen.";
  }
  if (bytes.length < 12 || !FIRMAS[tipo](bytes)) return MENSAJE_FORMATO;

  return null;
}

module.exports = { errorEnFotoPerfil, FORMATOS_VALIDOS, TAMANO_MAXIMO_BYTES };
