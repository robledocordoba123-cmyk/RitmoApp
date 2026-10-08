import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { HelpCircle, X, Mail, ListChecks } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import AccordionItem from "./ui/Accordion";

// Contenido genérico por rol: funciona igual para cualquier academia que se
// registre, no depende de datos de una academia en particular.
const CONTENIDO_AYUDA = {
  ADMIN_ACADEMIA: {
    titulo: "Guía para administradores",
    pasos: [
      "Crea tus salones en “Salones”, con su capacidad real.",
      "Agrega los ritmos que ofrece tu academia en “Ritmos”.",
      "Da de alta a tus profesores en “Equipo” — ellos no se registran solos.",
      "Programa tus clases asignando salón, ritmo, profesor y horario.",
      "Crea tus planes en “Tarifas” y registra cada pago en “Pagos”.",
      "Revisa “Reportes” para ver qué tan lleno está cada salón y cuánto has recibido.",
    ],
    preguntas: [
      { q: "¿Por qué no puedo programar una clase?", a: "Necesitas al menos un salón, un ritmo y un profesor registrado en tu academia antes de poder programar una clase." },
      { q: "¿Por qué se rechaza una clase que intento crear?", a: "El sistema no permite dos clases en el mismo salón o con el mismo profesor si sus horarios se cruzan, aunque sea por unos minutos." },
      { q: "¿Puedo cancelar una clase ya programada?", a: "Sí, desde la lista de clases puedes cancelarla en cualquier momento mientras siga en estado “Programada”." },
      { q: "¿Por qué un estudiante no puede reservar?", a: "Si su membresía está vencida o nunca ha pagado, el sistema no le deja reservar. Registra su pago en “Pagos” y podrá hacerlo de inmediato." },
      { q: "¿Puedo borrar una tarifa?", a: "Solo si nunca se ha usado. Si ya tiene pagos, desactívala: deja de aparecer para pagos nuevos y el historial se conserva." },
      { q: "¿Cómo se registran mis estudiantes y profesores?", a: "Tú los das de alta desde “Equipo”, con su nombre, correo y una contraseña. Ellos no pueden registrarse solos: eso mantiene aislada la información entre academias." },
    ],
  },
  PROFESOR: {
    titulo: "Guía para profesores",
    pasos: [
      "En “Mis clases” verás todas las clases que tienes asignadas.",
      "El día de cada clase, entra y elige “Tomar asistencia”.",
      "Marca a cada estudiante como Asistió, Inasistencia o Excusa.",
    ],
    preguntas: [
      { q: "¿Puedo registrar asistencia de un día anterior?", a: "No. La asistencia solo se puede registrar el mismo día calendario de la clase, ni antes ni después." },
      { q: "¿Por qué no veo a un estudiante en la lista?", a: "Solo aparecen los estudiantes con una reserva confirmada para esa clase específica." },
    ],
  },
  ESTUDIANTE: {
    titulo: "Guía para estudiantes",
    pasos: [
      "Explora las clases disponibles en el “Catálogo”.",
      "Reserva tu cupo con un clic mientras haya disponibilidad.",
      "Revisa tus reservas activas en “Mis reservas”.",
      "En “Mis pagos” ves hasta cuándo está vigente tu membresía.",
    ],
    preguntas: [
      { q: "¿Por qué no pude reservar una clase?", a: "Puede ser que tu membresía esté vencida, que el cupo se haya agotado justo antes que tú, que la clase ya haya pasado, o que ya tengas una reserva para esa misma clase." },
      { q: "¿Cómo pago mi membresía?", a: "Pagas en la academia por el medio que acepten (efectivo, transferencia o tarjeta) y el administrador lo registra. Apenas lo haga, tu membresía queda al día." },
      { q: "¿Puedo perder mi cupo si no asisto?", a: "Tu reserva queda registrada; es tu profesor quien marca la asistencia el día de la clase." },
    ],
  },
  SUPERADMIN: {
    titulo: "Guía para SuperAdmin",
    pasos: [
      "En “Academias” verás todas las academias registradas en la plataforma.",
      "Puedes suspender o reactivar el acceso de cualquier academia.",
    ],
    preguntas: [
      { q: "¿Qué pasa cuando suspendo una academia?", a: "Todos sus usuarios (administrador, profesores y estudiantes) dejan de poder iniciar sesión hasta que la reactives." },
    ],
  },
};

export default function HelpPanel() {
  const { usuario } = useAuth();
  const [abierto, setAbierto] = useState(false);
  const contenido = CONTENIDO_AYUDA[usuario?.rol];

  if (!contenido) return null;

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        title="Ayuda"
        className="fixed bottom-5 right-5 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-fuchsia-500 text-white shadow-lg shadow-indigo-300/40 dark:shadow-none hover:scale-105 transition"
      >
        <HelpCircle size={22} />
      </button>

      <AnimatePresence>
        {abierto && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAbierto(false)}
              className="fixed inset-0 z-40 bg-black/40"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.25 }}
              className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-white dark:bg-gray-900 shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between px-5 h-16 border-b border-gray-100 dark:border-gray-800 shrink-0">
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">{contenido.titulo}</h2>
                <button onClick={() => setAbierto(false)} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-5">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                  <ListChecks size={16} /> Primeros pasos
                </div>
                <ol className="space-y-2.5 mb-8">
                  {contenido.pasos.map((paso, i) => (
                    <li key={i} className="flex gap-3 text-sm text-gray-700 dark:text-gray-300">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
                        {i + 1}
                      </span>
                      {paso}
                    </li>
                  ))}
                </ol>

                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Preguntas frecuentes</p>
                <div>
                  {contenido.preguntas.map((p) => (
                    <AccordionItem key={p.q} pregunta={p.q} respuesta={p.a} />
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-100 dark:border-gray-800 p-5 shrink-0">
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">¿Tu pregunta no está aquí?</p>
                <a
                  href="mailto:soporte@ritmoapp.com"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800"
                >
                  <Mail size={15} /> Escríbenos a soporte@ritmoapp.com
                </a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
