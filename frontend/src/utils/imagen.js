// RF-07 · HU-07: la foto de perfil se reduce en el navegador antes de
// enviarla. Una foto de celular pesa varios MB; recortada en cuadrado a 256 px
// y guardada como JPEG queda en unos pocos KB, que la API acepta sin problema.

export const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp']
export const FORMATOS_VALIDOS = 'JPG, PNG o WebP'
const LADO = 256

export function formatoPermitido(archivo) {
  return Boolean(archivo) && TIPOS_PERMITIDOS.includes(archivo.type)
}

// Devuelve una data URL JPEG cuadrada de 256 px, recortada desde el centro.
export async function reducirFoto(archivo) {
  const imagen = await createImageBitmap(archivo)
  const lado = Math.min(imagen.width, imagen.height)
  const lienzo = document.createElement('canvas')
  lienzo.width = LADO
  lienzo.height = LADO
  lienzo
    .getContext('2d')
    .drawImage(imagen, (imagen.width - lado) / 2, (imagen.height - lado) / 2, lado, lado, 0, 0, LADO, LADO)
  imagen.close?.()
  return lienzo.toDataURL('image/jpeg', 0.85)
}
