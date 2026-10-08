import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, KeyRound, Sparkles } from "lucide-react";
import { api } from "../api/client";

const LONGITUD_MINIMA = 8;
const CAMPO =
  "w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

// RF-05 · HU-05: página a la que llega el enlace del correo. El token viaja
// en la URL y la API decide si sigue vigente (RN-07).
export default function RestablecerContrasenaPage() {
  const [parametros] = useSearchParams();
  const token = parametros.get("token");
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function guardar(e) {
    e.preventDefault();
    setError("");
    if (password !== confirmacion) {
      setError("Las dos contraseñas no coinciden.");
      return;
    }
    setCargando(true);
    try {
      const { mensaje } = await api.post("/auth/restablecer", { token, password });
      toast.success(mensaje);
      navigate("/login", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-white dark:bg-gray-950">
      <div className="w-full max-w-sm">
        <Link to="/" className="flex items-center gap-2 mb-10">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-fuchsia-500 text-white">
            <Sparkles size={16} />
          </div>
          <span className="font-semibold text-gray-900 dark:text-gray-100">RitmoApp</span>
        </Link>

        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Crea una nueva contraseña</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-8">Debe tener al menos {LONGITUD_MINIMA} caracteres.</p>

        {!token ? (
          <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400 rounded-lg px-3 py-2">
            Este enlace está incompleto.{" "}
            <Link to="/recuperar-contrasena" className="font-medium underline">
              Solicita uno nuevo
            </Link>
            .
          </p>
        ) : (
          <form onSubmit={guardar} className="space-y-4">
            <div>
              <label htmlFor="nueva" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nueva contraseña
              </label>
              <input
                id="nueva"
                type="password"
                required
                minLength={LONGITUD_MINIMA}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={CAMPO}
              />
            </div>
            <div>
              <label htmlFor="confirmacion" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Repite la contraseña
              </label>
              <input
                id="confirmacion"
                type="password"
                required
                minLength={LONGITUD_MINIMA}
                autoComplete="new-password"
                value={confirmacion}
                onChange={(e) => setConfirmacion(e.target.value)}
                className={CAMPO}
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400 rounded-lg px-3 py-2">
                {error}{" "}
                {/venció|no es válido/.test(error) && (
                  <Link to="/recuperar-contrasena" className="font-medium underline">
                    Pedir otro enlace
                  </Link>
                )}
              </p>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-fuchsia-500 py-2.5 text-sm font-medium text-white hover:from-indigo-700 hover:to-fuchsia-600 disabled:opacity-50"
            >
              <KeyRound size={16} /> {cargando ? "Guardando..." : "Guardar contraseña"}
            </button>
          </form>
        )}

        <Link to="/login" className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 dark:text-indigo-400">
          <ArrowLeft size={14} /> Volver a iniciar sesión
        </Link>
      </div>
    </div>
  );
}
