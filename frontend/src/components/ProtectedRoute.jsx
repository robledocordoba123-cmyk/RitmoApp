import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { rutaInicioPara } from "../rutas";

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
