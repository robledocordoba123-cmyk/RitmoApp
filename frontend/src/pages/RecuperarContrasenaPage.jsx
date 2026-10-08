import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, MailCheck, Send, Sparkles } from "lucide-react";
import { api } from "../api/client";

const CAMPO =
  "w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

// RF-05 · HU-05: el usuario pide un enlace para crear una nueva contraseña.
// La respuesta es la misma exista o no el correo (no revela quién está registrado).
export default function RecuperarContrasenaPage() {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      const { mensaje } = await api.post("/auth/recuperar", { email });
      setEnviado(mensaje);
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

        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">¿Olvidaste tu contraseña?</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-8">
          Escribe tu correo y te enviaremos un enlace para crear una nueva. El enlace vence en 30 minutos.
        </p>

        {enviado ? (
          <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
            <MailCheck size={18} className="mt-0.5 shrink-0" />
            <p>{enviado}</p>
          </div>
        ) : (
          <form onSubmit={enviar} className="space-y-4">
            <div>
              <label htmlFor="correo" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Correo
              </label>
              <input id="correo" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={CAMPO} />
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400 rounded-lg px-3 py-2">{error}</p>}

            <button
              type="submit"
              disabled={cargando}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-fuchsia-500 py-2.5 text-sm font-medium text-white hover:from-indigo-700 hover:to-fuchsia-600 disabled:opacity-50"
            >
              <Send size={16} /> {cargando ? "Enviando..." : "Enviar enlace"}
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
