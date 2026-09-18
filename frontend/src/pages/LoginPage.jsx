import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles, LogIn } from "lucide-react";
import loginDance from "../assets/login-dance.jpg";
import { useAuth } from "../context/AuthContext";
import { rutaInicioPara } from "../rutas";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function manejarSubmit(e) {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      const usuario = await login(email, password);
      navigate(rutaInicioPara(usuario.rol));
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white dark:bg-gray-950">
      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <Link to="/" className="flex items-center gap-2 mb-10">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-fuchsia-500 text-white">
              <Sparkles size={16} />
            </div>
            <span className="font-semibold text-gray-900 dark:text-gray-100">RitmoApp</span>
          </Link>

          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Inicia sesión</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-8">Entra a tu panel de RitmoApp.</p>

          <form onSubmit={manejarSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Correo</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contraseña</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400 rounded-lg px-3 py-2">{error}</p>}

            <button
              type="submit"
              disabled={cargando}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200 dark:shadow-none disabled:opacity-50"
            >
              <LogIn size={16} /> {cargando ? "Ingresando..." : "Ingresar"}
            </button>
          </form>

          <p className="text-sm text-gray-500 dark:text-gray-400 mt-6">
            ¿Tu academia aún no está registrada?{" "}
            <Link to="/registro-academia" className="text-indigo-600 dark:text-indigo-400 font-medium">
              Regístrala aquí
            </Link>
          </p>
        </div>
      </div>

      <div className="hidden lg:block relative overflow-hidden bg-indigo-950">
        <img src={loginDance} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-700/50 via-indigo-950/30 to-fuchsia-800/40 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-t from-indigo-950/90 via-transparent to-transparent" />
        <div className="relative h-full flex flex-col justify-end p-12">
          <p className="text-2xl font-medium text-white leading-snug max-w-md">
            "Cada academia, con su propio espacio. Nunca se mezclan, nunca se pierden."
          </p>
          <p className="text-sm text-white/60 mt-3">Aislamiento multi-academia, incorporado desde el primer día.</p>
        </div>
      </div>
    </div>
  );
}
