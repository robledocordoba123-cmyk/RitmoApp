# ADR-003 · Correo transaccional por la API HTTP de Brevo

- **Estado:** Aceptada
- **Fecha:** 08/10/2026
- **Responsables:** Manuela Córdoba Robledo, Davier Andrés Quinto Bejarano

## Contexto

La recuperación de contraseña (HU-05, RF-05, RN-07) envía un enlace por correo. La primera versión usaba SMTP con una cuenta de Gmail. En la demo pública el correo nunca llegaba: desde septiembre de 2025, el plan gratuito de Render bloquea el tráfico de salida a los puertos SMTP (25, 465 y 587), y la conexión fallaba por tiempo de espera.

## Decisión

- En producción el correo se envía por la **API HTTP de Brevo** (puerto 443), que funciona en el plan gratuito de Render. Plan gratuito de Brevo: 300 correos al día.
- `backend/src/utils/correo.js` elige el medio solo: si existe `BREVO_API_KEY` usa Brevo; si no, usa SMTP (útil en desarrollo local); si no hay ninguno, en desarrollo muestra el correo en la consola y en producción solo deja un aviso, sin imprimir el enlace.
- El remitente es una dirección verificada en Brevo y se configura con `CORREO_REMITENTE`. La clave vive solo en las variables de entorno de Render, nunca en el repositorio.

## Alternativas consideradas

| Alternativa | Por qué no se eligió |
|---|---|
| **Pasar Render a un plan de pago** para usar SMTP | Tiene costo mensual y no aporta nada más al proyecto. |
| **Resend** u otra API similar | Sin dominio propio solo permite enviar a la dirección del dueño de la cuenta; Brevo permite enviar a cualquier usuario con un remitente verificado. |
| **No enviar correo** y mostrar el enlace en pantalla | Rompe la seguridad del flujo: cualquiera podría cambiar la contraseña de otra persona. |

## Consecuencias

**Positivas**

- La recuperación de contraseña funciona en la demo pública; verificado el 08/10/2026 con un correo real que llegó a la bandeja de entrada.
- El código no depende de un proveedor: cambiar Brevo por otro servicio solo toca `utils/correo.js`.

**Negativas / riesgos aceptados**

- El remitente es una dirección @gmail.com y no un dominio propio, así que algunos correos pueden llegar a Spam. Se resolvería con un dominio propio autenticado (SPF, DKIM, DMARC).
- Depende de un servicio externo: si Brevo falla, el enlace no llega. El error queda registrado en el servidor y el usuario puede pedir otro enlace.

## Referencias

- Aviso de Render: https://render.com/changelog/free-web-services-will-no-longer-allow-outbound-traffic-to-smtp-ports
- Pull Requests #6 (recuperar contraseña) y #8 (envío por Brevo). UML-02 v2.0 (despliegue).
