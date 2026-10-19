import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";

// Política de tratamiento de datos personales (Ley 1581 de 2012 y Decreto
// 1377 de 2013, compilado en el Decreto 1074 de 2015). Si el texto cambia,
// hay que subir la versión aquí y en backend/src/utils/privacidad.js, para
// que las autorizaciones nuevas queden con la versión que la persona leyó.
const VERSION = "1.0";
const VIGENTE_DESDE = "12 de octubre de 2026";
const CORREO_CONTACTO = "robledocordoba123@gmail.com";

// UI-06 · Ley 1581 de 2012: política de tratamiento de datos personales,
// pública. Su VERSION debe ser la misma que VERSION_POLITICA_DATOS del backend,
// en backend/src/utils/privacidad.js.
export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link to="/" className="flex items-center gap-2 mb-10">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-fuchsia-500 text-white">
            <Sparkles size={16} />
          </div>
          <span className="font-semibold text-gray-900 dark:text-gray-100">RitmoApp</span>
        </Link>

        <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">Política de tratamiento de datos personales</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          Versión {VERSION} · vigente desde el {VIGENTE_DESDE}
        </p>

        <div className="mt-8 space-y-8 text-[15px] leading-relaxed text-gray-700 dark:text-gray-300">
          <Seccion titulo="1. Quién es responsable de tus datos">
            <p>
              Cada academia que usa RitmoApp es la <b>responsable</b> de los datos de su equipo: decide para qué los usa y es quien
              pide tu autorización. El equipo de RitmoApp (Manuela Córdoba Robledo y Davier Andrés Quinto Bejarano) es el{" "}
              <b>encargado</b>: guarda y procesa los datos solo para prestar el servicio a la academia, y no los usa para nada más.
            </p>
          </Seccion>

          <Seccion titulo="2. Qué datos guardamos">
            <ul className="list-disc pl-5 space-y-1">
              <li>Nombre y correo electrónico.</li>
              <li>Tu contraseña, siempre cifrada: nadie puede leerla, ni siquiera nosotros.</li>
              <li>Tu rol en la academia (administrador, profesor o estudiante).</li>
              <li>Las clases que reservas o dictas, y tu asistencia.</li>
              <li>Los pagos que la academia registra y la vigencia de tu membresía.</li>
              <li>Datos técnicos de seguridad: la dirección IP y la hora de cada petición, para detectar accesos indebidos.</li>
            </ul>
            <p className="mt-2">No pedimos datos sensibles (salud, origen, creencias) ni datos de tarjetas: los pagos se registran, no se cobran en la plataforma.</p>
          </Seccion>

          <Seccion titulo="3. Para qué los usamos">
            <ul className="list-disc pl-5 space-y-1">
              <li>Crear y proteger tu cuenta.</li>
              <li>Programar clases, manejar cupos y reservas, y tomar asistencia.</li>
              <li>Llevar el control de pagos y membresías de la academia.</li>
              <li>Mostrarle a la academia reportes de ocupación e ingresos.</li>
              <li>Enviarte el correo para recuperar tu contraseña cuando lo pidas.</li>
            </ul>
            <p className="mt-2">No vendemos ni compartimos tus datos con terceros para publicidad.</p>
          </Seccion>

          <Seccion titulo="4. Niños, niñas y adolescentes">
            <p>
              Si un estudiante es menor de edad, la autorización para tratar sus datos la da su padre, madre o representante legal,
              y la academia debe tenerla antes de crear la cuenta. Solo se usan los datos necesarios para las clases y siempre
              respetando el interés superior del menor.
            </p>
          </Seccion>

          <Seccion titulo="5. Tus derechos">
            <p>Como titular de los datos puedes:</p>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li>Conocer, actualizar y corregir tus datos.</li>
              <li>Pedir prueba de la autorización que diste.</li>
              <li>Saber para qué se han usado tus datos.</li>
              <li>Revocar la autorización o pedir que se borren, cuando no exista un deber legal o contractual de conservarlos.</li>
              <li>Presentar quejas ante la Superintendencia de Industria y Comercio.</li>
              <li>Consultar tus datos gratis.</li>
            </ul>
          </Seccion>

          <Seccion titulo="6. Cómo ejercerlos">
            <p>
              Escríbele a tu academia o al correo{" "}
              <a href={`mailto:${CORREO_CONTACTO}`} className="text-indigo-600 dark:text-indigo-400 underline">
                {CORREO_CONTACTO}
              </a>{" "}
              con tu nombre, tu correo registrado y lo que necesitas. Las consultas se responden en máximo 10 días hábiles y los
              reclamos en máximo 15 días hábiles, como lo establece la ley.
            </p>
          </Seccion>

          <Seccion titulo="7. Cómo protegemos tus datos y dónde se guardan">
            <p>
              Las contraseñas se guardan cifradas, cada academia solo ve sus propios datos, el acceso se controla por rol y toda la
              comunicación viaja cifrada (HTTPS). Los datos se guardan en servicios en la nube ubicados fuera de Colombia: la base de
              datos y el servidor en Estados Unidos, y el envío de correos en la Unión Europea. Esos proveedores solo los procesan para
              prestar el servicio.
            </p>
          </Seccion>

          <Seccion titulo="8. Cambios a esta política">
            <p>
              Si la política cambia, publicaremos la nueva versión en esta página. RitmoApp guarda la fecha y la versión que aceptó
              cada persona.
            </p>
          </Seccion>

          <p className="text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-800 pt-6">
            RitmoApp es el proyecto de grado de Tecnología en Análisis y Desarrollo de Software del SENA (ficha 3229209). La demo
            pública usa datos ficticios.
          </p>
        </div>
      </div>
    </div>
  );
}

function Seccion({ titulo, children }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{titulo}</h2>
      {children}
    </section>
  );
}
