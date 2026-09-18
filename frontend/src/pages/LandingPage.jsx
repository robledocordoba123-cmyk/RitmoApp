import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import heroDance from "../assets/hero-dance.jpg";
import AccordionItem from "../components/ui/Accordion";
import {
  Sparkles,
  CalendarCheck2,
  ShieldCheck,
  BarChart3,
  Users2,
  Building2,
  Zap,
  ArrowRight,
  UserPlus,
  CalendarDays,
  Smile,
} from "lucide-react";

const CARACTERISTICAS = [
  {
    icon: CalendarCheck2,
    titulo: "Agendamiento sin choques",
    texto: "El sistema rechaza automáticamente cruces de horario en el mismo salón o con el mismo profesor, antes de que se conviertan en un problema el día de la clase.",
  },
  {
    icon: Zap,
    titulo: "Cupos en tiempo real",
    texto: "Control de concurrencia real: si dos estudiantes van por el último cupo al mismo tiempo, solo uno se queda con él. Nunca overbooking.",
  },
  {
    icon: ShieldCheck,
    titulo: "Aislamiento multi-academia",
    texto: "Cada academia opera en su propio espacio, completamente aislado de las demás, sin importar que compartan la misma plataforma.",
  },
  {
    icon: BarChart3,
    titulo: "Reportes de ocupación",
    texto: "Visualiza qué tan lleno está cada salón en cualquier rango de fechas, para tomar decisiones con datos y no con intuición.",
  },
];

const ROLES = [
  { icon: Building2, nombre: "SuperAdmin", detalle: "Supervisa todas las academias de la plataforma y su estado de suscripción." },
  { icon: Users2, nombre: "Administrador", detalle: "Gestiona salones, ritmos, clases y profesores de su propia academia." },
  { icon: CalendarCheck2, nombre: "Profesor", detalle: "Consulta sus clases y registra la asistencia el mismo día." },
  { icon: Sparkles, nombre: "Estudiante", detalle: "Explora el catálogo y reserva su cupo en segundos." },
];

const PASOS = [
  { icon: UserPlus, titulo: "Registra tu academia", texto: "Crea tu cuenta de administrador en menos de un minuto, sin instalar nada." },
  { icon: CalendarDays, titulo: "Programa tus clases", texto: "Define salones, ritmos, profesores y horarios. El sistema evita los cruces por ti." },
  { icon: Smile, titulo: "Tus estudiantes reservan solos", texto: "Ellos ven el catálogo en tiempo real y reservan su cupo sin llamarte ni escribirte." },
];

const PREGUNTAS = [
  {
    q: "¿Mis datos se mezclan con los de otras academias?",
    a: "No. Cada academia está completamente aislada a nivel de base de datos: ningún usuario de otra academia puede ver ni modificar tu información, sin importar que compartan la misma plataforma.",
  },
  {
    q: "¿Qué pasa si dos estudiantes reservan el último cupo al mismo tiempo?",
    a: "Solo uno se queda con él. El control de cupos usa una operación atómica a nivel de base de datos, así que no hay forma de que se genere overbooking incluso bajo uso simultáneo real.",
  },
  {
    q: "¿Necesito instalar algo?",
    a: "No. RitmoApp funciona completamente desde el navegador, tanto en computador como en celular.",
  },
  {
    q: "¿Puedo tener varios profesores y salones?",
    a: "Sí, sin límite. Cada academia configura sus propios salones, ritmos y profesores de forma independiente.",
  },
];

function Reveal({ children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.4, delay }}
    >
      {children}
    </motion.div>
  );
}


export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <header className="border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-500 text-white">
              <Sparkles size={16} />
            </div>
            <span className="font-semibold">RitmoApp</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
              Iniciar sesión
            </Link>
            <Link
              to="/registro-academia"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200 dark:shadow-none"
            >
              Registra tu academia
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-fuchsia-50 dark:from-indigo-950/40 dark:via-gray-950 dark:to-fuchsia-950/20" />
        <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-20 grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left">
            <motion.span
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950 px-3 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300 mb-6"
            >
              <Sparkles size={12} /> SaaS multi-academia para escuelas de baile
            </motion.span>
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
              className="text-4xl sm:text-5xl font-semibold tracking-tight text-gray-900 dark:text-gray-50"
            >
              Una plataforma.{" "}
              <span className="bg-gradient-to-r from-indigo-600 to-fuchsia-500 bg-clip-text text-transparent">
                Todas tus academias.
              </span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mt-5 text-lg text-gray-600 dark:text-gray-400 max-w-lg mx-auto lg:mx-0"
            >
              RitmoApp reemplaza los cuadernos, el Excel y los grupos de WhatsApp con agendamiento, control de cupos y
              asistencia en tiempo real — para cada academia, de forma aislada y segura.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="mt-8 flex items-center justify-center lg:justify-start gap-3"
            >
              <Link
                to="/registro-academia"
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200 dark:shadow-none"
              >
                Registra tu academia gratis <ArrowRight size={16} />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Ya tengo cuenta
              </Link>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative"
          >
            <div className="absolute -inset-4 bg-gradient-to-tr from-indigo-400 via-fuchsia-400 to-violet-400 rounded-[2rem] blur-2xl opacity-30 dark:opacity-25" />
            <div className="relative rounded-[1.75rem] overflow-hidden border border-white/60 dark:border-gray-800 shadow-2xl shadow-indigo-900/10">
              <img src={heroDance} alt="Pareja bailando" className="w-full h-[420px] sm:h-[480px] object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-indigo-950/50 via-transparent to-transparent" />
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="absolute -bottom-5 -left-5 hidden sm:flex items-center gap-3 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-lg px-4 py-3 max-w-[220px]"
            >
              <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400">
                <CalendarCheck2 size={17} />
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-white dark:ring-gray-900 animate-pulse" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Un estudiante reservó su cupo</p>
                <p className="text-xs text-gray-400">Clase de Salsa · 6:00 p.m.</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.75 }}
              className="absolute -top-5 -right-5 hidden sm:block rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-lg px-4 py-3 w-40"
            >
              <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500">
                <BarChart3 size={13} />
                <p className="text-[11px] font-medium uppercase tracking-wide">Ocupación del salón</p>
              </div>
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-1">87%</p>
              <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-800 mt-1.5">
                <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: "87%" }} />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {CARACTERISTICAS.map((c, i) => (
            <Reveal key={c.titulo} delay={i * 0.05}>
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-5 h-full">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 mb-3">
                  <c.icon size={19} />
                </div>
                <p className="font-medium text-gray-900 dark:text-gray-100">{c.titulo}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">{c.texto}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="bg-gray-50 dark:bg-gray-900/40 border-y border-gray-100 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <Reveal>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 text-center mb-2">Cómo funciona</h2>
            <p className="text-gray-500 dark:text-gray-400 text-center mb-10">De cero a tu primera clase reservada, en tres pasos.</p>
          </Reveal>
          <div className="grid sm:grid-cols-3 gap-6">
            {PASOS.map((p, i) => (
              <Reveal key={p.titulo} delay={i * 0.1}>
                <div className="text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-indigo-600 dark:text-indigo-400 mb-3 shadow-sm">
                    <p.icon size={22} />
                  </div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {i + 1}. {p.titulo}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 max-w-xs mx-auto">{p.texto}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-16">
        <Reveal>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 text-center mb-2">Un panel para cada rol</h2>
          <p className="text-gray-500 dark:text-gray-400 text-center mb-10">Cada quien ve exactamente lo que necesita, nada más.</p>
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {ROLES.map((r, i) => (
            <Reveal key={r.nombre} delay={i * 0.05}>
              <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 text-center h-full">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-950 text-violet-600 dark:text-violet-400 mb-3">
                  <r.icon size={20} />
                </div>
                <p className="font-medium text-gray-900 dark:text-gray-100">{r.nombre}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">{r.detalle}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="bg-gray-50 dark:bg-gray-900/40 border-y border-gray-100 dark:border-gray-800">
        <div className="max-w-2xl mx-auto px-6 py-16">
          <Reveal>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 text-center mb-8">Preguntas frecuentes</h2>
          </Reveal>
          <Reveal>
            <div>
              {PREGUNTAS.map((p) => (
                <AccordionItem key={p.q} pregunta={p.q} respuesta={p.a} />
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <Reveal>
          <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-gray-100">
            Deja de perseguir cupos por WhatsApp.
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-3">Registra tu academia y prográmala en minutos.</p>
          <Link
            to="/registro-academia"
            className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-medium text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200 dark:shadow-none"
          >
            Empezar gratis <ArrowRight size={16} />
          </Link>
        </Reveal>
      </section>

      <footer className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-gray-400 dark:text-gray-600">
        <span>© {new Date().getFullYear()} RitmoApp</span>
        <span>Proyecto formativo SENA · Ficha 3229209</span>
        <span className="text-xs">
          Foto de portada:{" "}
          <a href="https://unsplash.com/photos/spmbpgtvOiw" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600 dark:hover:text-gray-400">
            Unsplash
          </a>
        </span>
      </footer>
    </div>
  );
}
