import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, CircleCheck, Sparkles } from "lucide-react";
import { api } from "../api/client";
import ReenviarConfirmacion from "../components/ReenviarConfirmacion";

// RF-06 · HU-06: página a la que llega el enlace del correo de confirmación.
// Al abrirla se manda el token a la API, que decide si sigue vigente.
// Pantalla UI-29 (DOC-05).
export default function ConfirmarCuentaPage() {
  const [parametros] = useSearchParams();
  const token = parametros.get("token");
  const [estado, setEstado] = useState(token ? "confirmando" : "error");
  const [mensaje, setMensaje] = useState(token ? "" : "Este enlace está incompleto.");
  const [email, setEmail] = useState("");
  // En desarrollo, React ejecuta los efectos dos veces; el enlace sirve una
  // sola vez, así que la segunda llamada daría error. Esto la evita.
  const enviado = useRef(false);

  useEffect(() => {
    if (!token || enviado.current) return;
    enviado.current = true;
    api
      .post("/auth/confirmar", { token })
      .then((respuesta) => {
        setMensaje(respuesta.mensaje);
        setEstado("confirmada");
      })
      .catch((err) => {
        setMensaje(err.message);
        setEstado("error");
      });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-white dark:bg-gray-950">
      <div className="w-full max-w-sm">
        <Link to="/" className="flex items-center gap-2 mb-10">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-fuchsia-500 text-white">
            <Sparkles size={16} />
          </div>
          <span className="font-semibold text-gray-900 dark:text-gray-100">RitmoApp</span>
        </Link>

        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Confirma tu cuenta</h1>

        {estado === "confirmando" && <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">Confirmando tu cuenta...</p>}

        {estado === "confirmada" && (
          <div className="mt-6">
            <p className="flex items-start gap-2 text-sm text-emerald-700 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400 rounded-lg px-3 py-2">
              <CircleCheck size={16} className="mt-0.5 shrink-0" /> {mensaje}
            </p>
            <Link
              to="/login"
              className="mt-6 w-full inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-indigo-600 to-fuchsia-500 py-2.5 text-sm font-medium text-white hover:from-indigo-700 hover:to-fuchsia-600"
            >
              Iniciar sesión
            </Link>
          </div>
        )}

        {estado === "error" && (
          <div className="mt-6">
            <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400 rounded-lg px-3 py-2">{mensaje}</p>
            <label htmlFor="correo-reenvio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mt-6 mb-1">
              Escribe tu correo para recibir un enlace nuevo
            </label>
            <input
              id="correo-reenvio"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <ReenviarConfirmacion email={email} />
          </div>
        )}

        <Link to="/login" className="mt-8 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 dark:text-indigo-400">
          <ArrowLeft size={14} /> Volver a iniciar sesión
        </Link>
      </div>
    </div>
  );
}
