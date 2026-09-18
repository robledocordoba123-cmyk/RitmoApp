import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles, Rocket } from "lucide-react";
import authDance from "../assets/auth-dance.jpg";
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
      navigate("/admin/inicio");
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white dark:bg-gray-950">
      <div className="hidden lg:block relative overflow-hidden bg-indigo-950">
        <img src={authDance} alt="" className="absolute inset-0 h-full w-full object-cover opacity-90 mix-blend-luminosity" />
        <div className="absolute inset-0 bg-gradient-to-bl from-fuchsia-800/60 via-indigo-950/60 to-indigo-700/70" />
        <div className="absolute inset-0 bg-gradient-to-t from-indigo-950/95 via-transparent to-transparent" />
        <div className="relative h-full flex flex-col justify-end p-12">
          <p className="text-2xl font-medium text-white leading-snug max-w-md">
            "Deja de perseguir cupos por WhatsApp. Prográmalo una vez, sin choques."
          </p>
          <p className="text-sm text-white/60 mt-3">Tu academia, lista en menos de un minuto.</p>
        </div>
      </div>

      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <Link to="/" className="flex items-center gap-2 mb-8">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-fuchsia-500 text-white">
              <Sparkles size={16} />
            </div>
            <span className="font-semibold text-gray-900 dark:text-gray-100">RitmoApp</span>
          </Link>

          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Registra tu academia</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-6">
            Crea tu academia y tu cuenta de administrador en un solo paso.
          </p>

          <form onSubmit={manejarSubmit} className="space-y-3.5">
            <Campo label="Nombre de la academia" value={form.nombreAcademia} onChange={cambiar("nombreAcademia")} />
            <Campo label="NIT" value={form.nit} onChange={cambiar("nit")} />
            <Campo label="Tu nombre" value={form.nombreAdmin} onChange={cambiar("nombreAdmin")} />
            <Campo label="Correo" type="email" value={form.email} onChange={cambiar("email")} />
            <Campo label="Contraseña" type="password" value={form.password} onChange={cambiar("password")} />

            {error && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400 rounded-lg px-3 py-2">{error}</p>}

            <button
              type="submit"
              disabled={cargando}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200 dark:shadow-none disabled:opacity-50"
            >
              <Rocket size={16} /> {cargando ? "Creando..." : "Crear academia"}
            </button>
          </form>

          <p className="text-sm text-gray-500 dark:text-gray-400 mt-5">
            ¿Ya tienes cuenta?{" "}
            <Link to="/login" className="text-indigo-600 dark:text-indigo-400 font-medium">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Campo({ label, type = "text", value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      <input
        type={type}
        required
        value={value}
        onChange={onChange}
        className="w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );
}
