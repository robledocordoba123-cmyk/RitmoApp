import { Link } from "react-router-dom";
import {
  Sparkles,
  CalendarCheck2,
  ShieldCheck,
  BarChart3,
  Users2,
  Building2,
  Zap,
  ArrowRight,
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

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-500 text-white">
              <Sparkles size={16} />
            </div>
            <span className="font-semibold">RitmoApp</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Iniciar sesión
            </Link>
            <Link
              to="/registro-academia"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200"
            >
              Registra tu academia
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-violet-50" />
        <div className="relative max-w-4xl mx-auto px-6 pt-24 pb-20 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 mb-6">
            <Sparkles size={12} /> SaaS multi-academia para escuelas de baile
          </span>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-gray-900">
            Una plataforma. <span className="text-indigo-600">Todas tus academias.</span>
          </h1>
          <p className="mt-5 text-lg text-gray-600 max-w-2xl mx-auto">
            RitmoApp reemplaza los cuadernos, el Excel y los grupos de WhatsApp con agendamiento, control de cupos y
            asistencia en tiempo real — para cada academia, de forma aislada y segura.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              to="/registro-academia"
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200"
            >
              Registra tu academia gratis <ArrowRight size={16} />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Ya tengo cuenta
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {CARACTERISTICAS.map((c) => (
            <div key={c.titulo} className="rounded-2xl border border-gray-200 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 mb-3">
                <c.icon size={19} />
              </div>
              <p className="font-medium text-gray-900">{c.titulo}</p>
              <p className="text-sm text-gray-500 mt-1.5">{c.texto}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-semibold text-gray-900 text-center mb-2">Un panel para cada rol</h2>
          <p className="text-gray-500 text-center mb-10">Cada quien ve exactamente lo que necesita, nada más.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {ROLES.map((r) => (
              <div key={r.nombre} className="rounded-2xl bg-white border border-gray-200 p-5 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600 mb-3">
                  <r.icon size={20} />
                </div>
                <p className="font-medium text-gray-900">{r.nombre}</p>
                <p className="text-sm text-gray-500 mt-1.5">{r.detalle}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="max-w-6xl mx-auto px-6 py-10 flex items-center justify-between text-sm text-gray-400">
        <span>© {new Date().getFullYear()} RitmoApp</span>
        <span>Proyecto formativo SENA · Ficha 3229209</span>
      </footer>
    </div>
  );
}
