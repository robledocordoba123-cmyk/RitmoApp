import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { rutaInicioPara } from "../rutas";

// Envuelve cada pantalla privada (App.jsx). Sin sesión manda al login; con
// sesión pero de otro rol, al inicio de su propio panel. Es solo comodidad
// visual: la API vuelve a revisar el rol en cada petición (requireRole), así
// que esconder una ruta aquí no es la protección real.
export default function ProtectedRoute({ rolesPermitidos, children }) {
  const { estaAutenticado, usuario } = useAuth();

  if (!estaAutenticado) {
    return <Navigate to="/login" replace />;
  }

  if (rolesPermitidos && !rolesPermitidos.includes(usuario.rol)) {
    return <Navigate to={rutaInicioPara(usuario.rol)} replace />;
  }

  return children;
}
