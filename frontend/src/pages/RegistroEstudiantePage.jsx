import { useEffect, useId, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Sparkles, UserPlus, MailCheck, School } from "lucide-react";
import { api } from "../api/client";
import ReenviarConfirmacion from "../components/ReenviarConfirmacion";

// UI-31 · HU-22: un estudiante crea su cuenta con el código de invitación de
// su academia (lo trae el enlace ?codigo=… o lo escribe). Antes de llenar el
// resto ve a qué academia se está registrando. Debe aceptar la política de
// datos y, si es menor de edad, contar con la autorización de su representante
// legal (Ley 1581). Al terminar no entra: primero confirma su correo (HU-06).
export default function RegistroEstudiantePage() {
  const [parametros] = useSearchParams();
  const [codigo, setCodigo] = useState(parametros.get("codigo") || "");
  const [academia, setAcademia] = useState("");
  const [errorCodigo, setErrorCodigo] = useState("");
  const [form, setForm] = useState({ nombre: "", email: "", password: "" });
  const [aceptaPolitica, setAceptaPolitica] = useState(false);
  const [menorDeEdad, setMenorDeEdad] = useState(false);
  const [autorizaRepresentante, setAutorizaRepresentante] = useState(false);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [correoPendiente, setCorreoPendiente] = useState("");

  // Devuelve la academia del código o el mensaje de por qué no sirve.
  async function buscarAcademia(valor) {
    try {
      const respuesta = await api.get(`/auth/invitacion/${encodeURIComponent(valor.trim())}`);
      return { academia: respuesta.academia, error: "" };
    } catch (err) {
      return { academia: "", error: err.message };
    }
  }

  async function consultar(valor) {
    const { academia: nombre, error: mensaje } = valor.trim() ? await buscarAcademia(valor) : { academia: "", error: "" };
    setAcademia(nombre);
    setErrorCodigo(mensaje);
  }

  // Si el código vino en el enlace, se consulta de una vez.
  useEffect(() => {
    const inicial = parametros.get("codigo");
    if (!inicial) return;
    let vigente = true;
    void buscarAcademia(inicial).then(({ academia: nombre, error: mensaje }) => {
      if (!vigente) return;
      setAcademia(nombre);
      setErrorCodigo(mensaje);
    });
    return () => {
      vigente = false;
    };
  }, [parametros]);

  function cambiar(campo) {
    return (e) => setForm((prev) => ({ ...prev, [campo]: e.target.value }));
  }

  async function manejarSubmit(e) {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      const respuesta = await api.post("/auth/registro-estudiante", {
        codigo,
        ...form,
        aceptaPoliticaDatos: aceptaPolitica,
        menorDeEdad,
        autorizaRepresentante: menorDeEdad ? autorizaRepresentante : undefined,
      });
      setCorreoPendiente(respuesta.email);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950 px-4 py-12">
      <div className="w-full max-w-sm">
        <Link to="/" className="flex items-center gap-2 mb-8">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-fuchsia-500 text-white">
            <Sparkles size={16} />
          </div>
          <span className="font-semibold text-gray-900 dark:text-gray-100">RitmoApp</span>
        </Link>

        {correoPendiente ? (
          <div>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 mb-4">
              <MailCheck size={22} />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Revisa tu correo</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Tu cuenta en <strong className="text-gray-900 dark:text-gray-100">{academia}</strong> quedó creada. Te enviamos un enlace a{" "}
              <strong className="text-gray-900 dark:text-gray-100">{correoPendiente}</strong> para confirmarla. Ábrelo y después inicia
              sesión. Para reservar clases, la academia debe registrar tu pago.
            </p>
            <ReenviarConfirmacion email={correoPendiente} />
            <Link to="/login" className="mt-6 inline-flex text-sm font-medium text-indigo-600 dark:text-indigo-400">
              Ir a iniciar sesión
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Crea tu cuenta de estudiante</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-6">Usa el código de invitación que te dio tu academia.</p>

            <form onSubmit={manejarSubmit} className="space-y-3.5">
              <Campo
                label="Código de invitación"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                onBlur={() => void consultar(codigo)}
              />
              {academia && (
                <p role="status" className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-300 rounded-lg px-3 py-2">
                  <School size={15} /> Te vas a registrar en {academia}
                </p>
              )}
              {errorCodigo && <p className="text-sm text-red-600 dark:text-red-400">{errorCodigo}</p>}

              <Campo label="Tu nombre" value={form.nombre} onChange={cambiar("nombre")} />
              <Campo label="Correo" type="email" value={form.email} onChange={cambiar("email")} />
              <Campo label="Contraseña" type="password" value={form.password} onChange={cambiar("password")} />

              <Casilla checked={menorDeEdad} onChange={setMenorDeEdad}>
                Soy menor de edad
              </Casilla>
              {menorDeEdad && (
                <Casilla checked={autorizaRepresentante} onChange={setAutorizaRepresentante} required>
                  Mi madre, padre o representante legal leyó la política y autoriza el tratamiento de mis datos.
                </Casilla>
              )}
              <Casilla checked={aceptaPolitica} onChange={setAceptaPolitica} required>
                Acepto la{" "}
                <Link to="/privacidad" target="_blank" className="text-indigo-600 dark:text-indigo-400 font-medium underline">
                  política de tratamiento de datos
                </Link>
                .
              </Casilla>

              {error && (
                <p role="alert" className="text-sm text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={cargando}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-fuchsia-500 py-2.5 text-sm font-medium text-white hover:from-indigo-700 hover:to-fuchsia-600 shadow-sm shadow-indigo-200 dark:shadow-none disabled:opacity-50"
              >
                <UserPlus size={16} /> {cargando ? "Creando..." : "Crear mi cuenta"}
              </button>
            </form>

            <p className="text-sm text-gray-500 dark:text-gray-400 mt-5">
              ¿Ya tienes cuenta?{" "}
              <Link to="/login" className="text-indigo-600 dark:text-indigo-400 font-medium">
                Inicia sesión
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function Campo({ label, type = "text", value, onChange, onBlur }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      <input
        id={id}
        type={type}
        required
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        className="w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );
}

function Casilla({ checked, onChange, required = false, children }) {
  return (
    <label className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
      <input
        type="checkbox"
        required={required}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
      />
      <span>{children}</span>
    </label>
  );
}
