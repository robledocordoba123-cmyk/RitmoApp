import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { rutaInicioPara } from "./rutas";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

import LoginPage from "./pages/LoginPage";
import OnboardingPage from "./pages/OnboardingPage";

import CatalogoPage from "./pages/estudiante/CatalogoPage";
import MisReservasPage from "./pages/estudiante/MisReservasPage";

import SalonesPage from "./pages/admin/SalonesPage";
import RitmosPage from "./pages/admin/RitmosPage";
import ClasesPage from "./pages/admin/ClasesPage";
import ReportesPage from "./pages/admin/ReportesPage";

import MisClasesPage from "./pages/profesor/MisClasesPage";
import AsistenciaPage from "./pages/profesor/AsistenciaPage";

import AcademiasPage from "./pages/superadmin/AcademiasPage";

function ConLayout({ children }) {
  return <Layout>{children}</Layout>;
}

export default function App() {
  const { estaAutenticado, usuario } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={estaAutenticado ? <Navigate to={rutaInicioPara(usuario.rol)} replace /> : <LoginPage />}
      />
      <Route path="/registro-academia" element={estaAutenticado ? <Navigate to={rutaInicioPara(usuario.rol)} replace /> : <OnboardingPage />} />

      <Route
        path="/estudiante/catalogo"
        element={
          <ProtectedRoute rolesPermitidos={["ESTUDIANTE"]}>
            <ConLayout>
              <CatalogoPage />
            </ConLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/estudiante/reservas"
        element={
          <ProtectedRoute rolesPermitidos={["ESTUDIANTE"]}>
            <ConLayout>
              <MisReservasPage />
            </ConLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/salones"
        element={
          <ProtectedRoute rolesPermitidos={["ADMIN_ACADEMIA"]}>
            <ConLayout>
              <SalonesPage />
            </ConLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/ritmos"
        element={
          <ProtectedRoute rolesPermitidos={["ADMIN_ACADEMIA"]}>
            <ConLayout>
              <RitmosPage />
            </ConLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/clases"
        element={
          <ProtectedRoute rolesPermitidos={["ADMIN_ACADEMIA"]}>
            <ConLayout>
              <ClasesPage />
            </ConLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reportes"
        element={
          <ProtectedRoute rolesPermitidos={["ADMIN_ACADEMIA"]}>
            <ConLayout>
              <ReportesPage />
            </ConLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/profesor/clases"
        element={
          <ProtectedRoute rolesPermitidos={["PROFESOR"]}>
            <ConLayout>
              <MisClasesPage />
            </ConLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profesor/clases/:id/asistencia"
        element={
          <ProtectedRoute rolesPermitidos={["PROFESOR"]}>
            <ConLayout>
              <AsistenciaPage />
            </ConLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/superadmin/academias"
        element={
          <ProtectedRoute rolesPermitidos={["SUPERADMIN"]}>
            <ConLayout>
              <AcademiasPage />
            </ConLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/"
        element={<Navigate to={estaAutenticado ? rutaInicioPara(usuario.rol) : "/login"} replace />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
