import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ENLACES_POR_ROL = {
  SUPERADMIN: [{ to: "/superadmin/academias", label: "Academias" }],
  ADMIN_ACADEMIA: [
    { to: "/admin/clases", label: "Clases" },
    { to: "/admin/salones", label: "Salones" },
    { to: "/admin/ritmos", label: "Ritmos" },
    { to: "/admin/reportes", label: "Reportes" },
  ],
  PROFESOR: [{ to: "/profesor/clases", label: "Mis clases" }],
  ESTUDIANTE: [
    { to: "/estudiante/catalogo", label: "Catálogo" },
    { to: "/estudiante/reservas", label: "Mis reservas" },
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="font-semibold text-gray-900">RitmoApp</span>
            <nav className="flex gap-4">
              {enlaces.map((enlace) => (
                <NavLink
                  key={enlace.to}
                  to={enlace.to}
                  className={({ isActive }) =>
                    `text-sm font-medium ${isActive ? "text-indigo-600" : "text-gray-500 hover:text-gray-800"}`
                  }
                >
                  {enlace.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{ETIQUETA_ROL[usuario?.rol]}</span>
            <button
              onClick={cerrarSesion}
              className="text-sm font-medium text-gray-500 hover:text-gray-800"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
