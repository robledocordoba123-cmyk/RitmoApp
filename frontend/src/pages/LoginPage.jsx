import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles, LogIn } from "lucide-react";
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-violet-50 px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-500 text-white mb-3">
            <Sparkles size={20} />
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Inicia sesión</h1>
          <p className="text-sm text-gray-500 mt-1">Entra a tu panel de RitmoApp</p>
        </div>

        <div className="bg-white p-7 rounded-2xl border border-gray-200 shadow-sm">
          <form onSubmit={manejarSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

            <button
              type="submit"
              disabled={cargando}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200 disabled:opacity-50"
            >
              <LogIn size={16} /> {cargando ? "Ingresando..." : "Ingresar"}
            </button>
          </form>
        </div>

        <p className="text-sm text-gray-500 mt-5 text-center">
          ¿Tu academia aún no está registrada?{" "}
          <Link to="/registro-academia" className="text-indigo-600 font-medium">
            Regístrala aquí
          </Link>
        </p>
        <p className="text-sm text-center mt-2">
          <Link to="/" className="text-gray-400 hover:text-gray-600">
            ← Volver al inicio
          </Link>
        </p>
      </div>
    </div>
  );
}
