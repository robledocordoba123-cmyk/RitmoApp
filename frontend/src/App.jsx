import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { rutaInicioPara } from "./rutas";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import OnboardingPage from "./pages/OnboardingPage";

import EstudianteDashboard from "./pages/estudiante/DashboardPage";
import CatalogoPage from "./pages/estudiante/CatalogoPage";
import MisReservasPage from "./pages/estudiante/MisReservasPage";

import AdminDashboard from "./pages/admin/DashboardPage";
import SalonesPage from "./pages/admin/SalonesPage";
import RitmosPage from "./pages/admin/RitmosPage";
import ClasesPage from "./pages/admin/ClasesPage";
import ReportesPage from "./pages/admin/ReportesPage";

import ProfesorDashboard from "./pages/profesor/DashboardPage";
import MisClasesPage from "./pages/profesor/MisClasesPage";
import AsistenciaPage from "./pages/profesor/AsistenciaPage";

import SuperadminDashboard from "./pages/superadmin/DashboardPage";
import AcademiasPage from "./pages/superadmin/AcademiasPage";

function ConLayout({ children }) {
  return <Layout>{children}</Layout>;
}

function ruta(path, rolesPermitidos, Componente) {
  return (
    <Route
      key={path}
      path={path}
      element={
        <ProtectedRoute rolesPermitidos={rolesPermitidos}>
          <ConLayout>
            <Componente />
          </ConLayout>
        </ProtectedRoute>
      }
    />
  );
}

export default function App() {
  const { estaAutenticado, usuario } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/login"
        element={estaAutenticado ? <Navigate to={rutaInicioPara(usuario.rol)} replace /> : <LoginPage />}
      />
      <Route
        path="/registro-academia"
        element={estaAutenticado ? <Navigate to={rutaInicioPara(usuario.rol)} replace /> : <OnboardingPage />}
      />

      {ruta("/estudiante/inicio", ["ESTUDIANTE"], EstudianteDashboard)}
      {ruta("/estudiante/catalogo", ["ESTUDIANTE"], CatalogoPage)}
      {ruta("/estudiante/reservas", ["ESTUDIANTE"], MisReservasPage)}

      {ruta("/admin/inicio", ["ADMIN_ACADEMIA"], AdminDashboard)}
      {ruta("/admin/salones", ["ADMIN_ACADEMIA"], SalonesPage)}
      {ruta("/admin/ritmos", ["ADMIN_ACADEMIA"], RitmosPage)}
      {ruta("/admin/clases", ["ADMIN_ACADEMIA"], ClasesPage)}
      {ruta("/admin/reportes", ["ADMIN_ACADEMIA"], ReportesPage)}

      {ruta("/profesor/inicio", ["PROFESOR"], ProfesorDashboard)}
      {ruta("/profesor/clases", ["PROFESOR"], MisClasesPage)}
      {ruta("/profesor/clases/:id/asistencia", ["PROFESOR"], AsistenciaPage)}

      {ruta("/superadmin/inicio", ["SUPERADMIN"], SuperadminDashboard)}
      {ruta("/superadmin/academias", ["SUPERADMIN"], AcademiasPage)}

      <Route path="*" element={<Navigate to={estaAutenticado ? rutaInicioPara(usuario.rol) : "/"} replace />} />
    </Routes>
  );
}
