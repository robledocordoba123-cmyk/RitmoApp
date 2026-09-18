import { useState } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  CalendarDays,
  DoorOpen,
  Music4,
  BarChart3,
  ClipboardList,
  Ticket,
  Building2,
  LogOut,
  Sparkles,
  Menu,
  X,
  Sun,
  Moon,
  Users2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import HelpPanel from "./HelpPanel";

const ENLACES_POR_ROL = {
  SUPERADMIN: [
    { to: "/superadmin/inicio", label: "Inicio", icon: LayoutDashboard },
    { to: "/superadmin/academias", label: "Academias", icon: Building2 },
  ],
  ADMIN_ACADEMIA: [
    { to: "/admin/inicio", label: "Inicio", icon: LayoutDashboard },
    { to: "/admin/clases", label: "Clases", icon: CalendarDays },
    { to: "/admin/salones", label: "Salones", icon: DoorOpen },
    { to: "/admin/ritmos", label: "Ritmos", icon: Music4 },
    { to: "/admin/equipo", label: "Equipo", icon: Users2 },
    { to: "/admin/reportes", label: "Reportes", icon: BarChart3 },
  ],
  PROFESOR: [
    { to: "/profesor/inicio", label: "Inicio", icon: LayoutDashboard },
    { to: "/profesor/clases", label: "Mis clases", icon: ClipboardList },
  ],
  ESTUDIANTE: [
    { to: "/estudiante/inicio", label: "Inicio", icon: LayoutDashboard },
    { to: "/estudiante/catalogo", label: "Catálogo", icon: CalendarDays },
    { to: "/estudiante/reservas", label: "Mis reservas", icon: Ticket },
  ],
};

const ETIQUETA_ROL = {
  SUPERADMIN: "SuperAdmin",
  ADMIN_ACADEMIA: "Administrador",
  PROFESOR: "Profesor",
  ESTUDIANTE: "Estudiante",
};

function Logo() {
  return (
    <Link
      to="/"
      title="Volver a la página principal"
      className="flex items-center gap-2 px-5 h-16 border-b border-gray-100 dark:border-gray-800 shrink-0 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-500 text-white">
        <Sparkles size={16} />
      </div>
      <span className="font-semibold text-gray-900 dark:text-gray-100">RitmoApp</span>
    </Link>
  );
}

function EnlacesNav({ enlaces, onNavegar }) {
  return (
    <nav className="flex-1 px-3 py-4 space-y-1">
      {enlaces.map((enlace) => (
        <NavLink
          key={enlace.to}
          to={enlace.to}
          onClick={onNavegar}
          className={({ isActive }) =>
            `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
              isActive
                ? "bg-gradient-to-r from-indigo-50 to-fuchsia-50 text-indigo-700 ring-1 ring-indigo-100 dark:from-indigo-950 dark:to-fuchsia-950/30 dark:text-indigo-300 dark:ring-indigo-900"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
            }`
          }
        >
          <enlace.icon size={17} />
          {enlace.label}
        </NavLink>
      ))}
    </nav>
  );
}

function PerfilYSalir({ usuario, iniciales, onSalir }) {
  const { tema, alternar } = useTheme();
  return (
    <div className="border-t border-gray-100 dark:border-gray-800 p-3 space-y-1">
      <button
        onClick={alternar}
        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
      >
        {tema === "oscuro" ? <Sun size={16} /> : <Moon size={16} />}
        {tema === "oscuro" ? "Modo claro" : "Modo oscuro"}
      </button>
      <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
          {iniciales}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
            {usuario?.nombre || ETIQUETA_ROL[usuario?.rol]}
          </p>
          <p className="truncate text-xs text-gray-500 dark:text-gray-400">{ETIQUETA_ROL[usuario?.rol]}</p>
        </div>
        <button
          onClick={onSalir}
          title="Cerrar sesión"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
        >
          <LogOut size={16} />
        </button>
      </div>
    </div>
  );
}

export default function Layout({ children }) {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const enlaces = ENLACES_POR_ROL[usuario?.rol] || [];

  function cerrarSesion() {
    logout();
    navigate("/login");
  }

  const iniciales = (usuario?.nombre || ETIQUETA_ROL[usuario?.rol] || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex relative">
      {/* Textura de fondo muy sutil: un dashboard funcional no se pinta de
          colores, pero tampoco tiene que ser plano. Un solo acento de marca,
          disciplinado, a baja opacidad. */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-[28rem] w-[28rem] rounded-full bg-indigo-200/40 dark:bg-indigo-800/10 blur-3xl" />
        <div className="absolute top-1/2 -left-32 h-96 w-96 rounded-full bg-fuchsia-200/25 dark:bg-fuchsia-900/10 blur-3xl" />
      </div>

      {/* Sidebar fijo en escritorio */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-gray-200 bg-white/90 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/90 relative z-10">
        <Logo />
        <EnlacesNav enlaces={enlaces} />
        <PerfilYSalir usuario={usuario} iniciales={iniciales} onSalir={cerrarSesion} />
      </aside>

      {/* Cajón deslizante en móvil */}
      {menuAbierto && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuAbierto(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 flex flex-col bg-white dark:bg-gray-900 shadow-xl">
            <div className="flex items-center justify-between pr-3">
              <Logo />
              <button onClick={() => setMenuAbierto(false)} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                <X size={20} />
              </button>
            </div>
            <EnlacesNav enlaces={enlaces} onNavegar={() => setMenuAbierto(false)} />
            <PerfilYSalir usuario={usuario} iniciales={iniciales} onSalir={cerrarSesion} />
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 relative z-10">
        <header className="flex md:hidden items-center justify-between h-14 px-4 border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <button onClick={() => setMenuAbierto(true)} className="text-gray-600 dark:text-gray-300">
            <Menu size={22} />
          </button>
          <span className="font-semibold text-gray-900 dark:text-gray-100">RitmoApp</span>
          <div className="w-[22px]" />
        </header>
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <HelpPanel />
    </div>
  );
}
