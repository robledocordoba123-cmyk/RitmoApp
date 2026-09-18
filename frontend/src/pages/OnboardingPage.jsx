import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function OnboardingPage() {
  const { onboarding } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ nombreAcademia: "", nit: "", nombreAdmin: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  function cambiar(campo) {
    return (e) => setForm((prev) => ({ ...prev, [campo]: e.target.value }));
  }

  async function manejarSubmit(e) {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      await onboarding(
        { nombre: form.nombreAcademia, nit: form.nit },
        { nombre: form.nombreAdmin, email: form.email, password: form.password }
      );
      navigate("/admin/clases");
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-md bg-white p-8 rounded-lg border border-gray-200">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Registra tu academia</h1>
        <p className="text-sm text-gray-500 mb-6">Crea tu academia y tu cuenta de administrador en un solo paso.</p>

        <form onSubmit={manejarSubmit} className="space-y-4">
          <Campo label="Nombre de la academia" value={form.nombreAcademia} onChange={cambiar("nombreAcademia")} />
          <Campo label="NIT" value={form.nit} onChange={cambiar("nit")} />
          <Campo label="Tu nombre" value={form.nombreAdmin} onChange={cambiar("nombreAdmin")} />
          <Campo label="Correo" type="email" value={form.email} onChange={cambiar("email")} />
          <Campo label="Contraseña" type="password" value={form.password} onChange={cambiar("password")} />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={cargando}
            className="w-full rounded-md bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {cargando ? "Creando..." : "Crear academia"}
          </button>
        </form>

        <p className="text-sm text-gray-500 mt-4 text-center">
          ¿Ya tienes cuenta?{" "}
          <Link to="/login" className="text-indigo-600 font-medium">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}

function Campo({ label, type = "text", value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        required
        value={value}
        onChange={onChange}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );
}
