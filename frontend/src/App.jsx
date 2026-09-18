import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { rutaInicioPara } from "./rutas";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

// Cada pantalla se descarga solo cuando se visita, en vez de meter todo
// (incluido Recharts, que pesa bastante) en un único archivo inicial.
const LandingPage = lazy(() => import("./pages/LandingPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));

const EstudianteDashboard = lazy(() => import("./pages/estudiante/DashboardPage"));
const CatalogoPage = lazy(() => import("./pages/estudiante/CatalogoPage"));
const MisReservasPage = lazy(() => import("./pages/estudiante/MisReservasPage"));

const AdminDashboard = lazy(() => import("./pages/admin/DashboardPage"));
const SalonesPage = lazy(() => import("./pages/admin/SalonesPage"));
const RitmosPage = lazy(() => import("./pages/admin/RitmosPage"));
const ClasesPage = lazy(() => import("./pages/admin/ClasesPage"));
const ReportesPage = lazy(() => import("./pages/admin/ReportesPage"));

const ProfesorDashboard = lazy(() => import("./pages/profesor/DashboardPage"));
const MisClasesPage = lazy(() => import("./pages/profesor/MisClasesPage"));
const AsistenciaPage = lazy(() => import("./pages/profesor/AsistenciaPage"));

const SuperadminDashboard = lazy(() => import("./pages/superadmin/DashboardPage"));
const AcademiasPage = lazy(() => import("./pages/superadmin/AcademiasPage"));

function ConLayout({ children }) {
  return <Layout>{children}</Layout>;
}

function CargandoPagina() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="h-8 w-8 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
    </div>
  );
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
    <Suspense fallback={<CargandoPagina />}>
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
    </Suspense>
  );
}
