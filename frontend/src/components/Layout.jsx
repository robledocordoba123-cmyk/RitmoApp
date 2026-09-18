import { NavLink, useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

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

export default function Layout({ children }) {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
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
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-gray-200 bg-white">
        <div className="flex items-center gap-2 px-5 h-16 border-b border-gray-100">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-500 text-white">
            <Sparkles size={16} />
          </div>
          <span className="font-semibold text-gray-900">RitmoApp</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {enlaces.map((enlace) => (
            <NavLink
              key={enlace.to}
              to={enlace.to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`
              }
            >
              <enlace.icon size={17} />
              {enlace.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-gray-100 p-3">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
              {iniciales}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">{usuario?.nombre || ETIQUETA_ROL[usuario?.rol]}</p>
              <p className="truncate text-xs text-gray-500">{ETIQUETA_ROL[usuario?.rol]}</p>
            </div>
            <button
              onClick={cerrarSesion}
              title="Cerrar sesión"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="flex md:hidden items-center justify-between h-14 px-4 border-b border-gray-200 bg-white">
          <span className="font-semibold text-gray-900">RitmoApp</span>
          <button onClick={cerrarSesion} className="text-sm text-gray-500">
            Salir
          </button>
        </header>
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
