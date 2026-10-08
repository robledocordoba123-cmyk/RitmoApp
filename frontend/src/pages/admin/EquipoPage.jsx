import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Users2, Plus, GraduationCap, User, Pencil, Power } from "lucide-react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import EmptyState from "../../components/ui/EmptyState";
import { SkeletonList } from "../../components/ui/Skeleton";

const VACIO = { nombre: "", email: "", password: "", rol: "PROFESOR" };

export default function EquipoPage() {
  const { token } = useAuth();
  const [tab, setTab] = useState("PROFESOR");
  const [profesores, setProfesores] = useState(null);
  const [estudiantes, setEstudiantes] = useState(null);
  const [form, setForm] = useState(VACIO);
  const [enviando, setEnviando] = useState(false);

  async function cargar() {
    const [p, e] = await Promise.all([
      api.get("/usuarios?rol=PROFESOR&incluirInactivos=true", token),
      api.get("/usuarios?rol=ESTUDIANTE&incluirInactivos=true", token),
    ]);
    setProfesores(p);
    setEstudiantes(e);
  }

  useEffect(() => {
    cargar();
  }, []);

  function cambiar(campo) {
    return (e) => setForm((prev) => ({ ...prev, [campo]: e.target.value }));
  }

  async function crear(e) {
    e.preventDefault();
    setEnviando(true);
    try {
      await api.post("/usuarios", form, token);
      toast.success(form.rol === "PROFESOR" ? "Profesor agregado." : "Estudiante agregado.");
      setForm({ ...VACIO, rol: form.rol });
      await cargar();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setEnviando(false);
    }
  }

  if (profesores === null || estudiantes === null) {
    return (
      <div>
        <PageHeader title="Equipo" subtitle="Profesores y estudiantes de tu academia." />
        <SkeletonList />
      </div>
    );
  }

  const lista = tab === "PROFESOR" ? profesores : estudiantes;

  return (
    <div>
      <PageHeader title="Equipo" subtitle="Aquí das de alta a tus profesores y estudiantes — no se registran solos." />

      <Card className="mb-6">
        <CardHeader title="Agregar persona" />
        <CardBody>
          <form onSubmit={crear} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 flex flex-col gap-1 col-span-2 sm:col-span-1">
              Rol
              <select
                value={form.rol}
                onChange={cambiar("rol")}
                className="rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="PROFESOR">Profesor</option>
                <option value="ESTUDIANTE">Estudiante</option>
              </select>
            </label>
            <Campo label="Nombre" value={form.nombre} onChange={cambiar("nombre")} />
            <Campo label="Correo" type="email" value={form.email} onChange={cambiar("email")} />
            <Campo label="Contraseña" type="password" value={form.password} onChange={cambiar("password")} />
            <div className="col-span-2 sm:col-span-4">
              <Button type="submit" icon={Plus} disabled={enviando}>
                Agregar {form.rol === "PROFESOR" ? "profesor" : "estudiante"}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-1 mb-4 w-fit">
        <button
          onClick={() => setTab("PROFESOR")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
            tab === "PROFESOR" ? "bg-gradient-to-r from-indigo-50 to-fuchsia-50 text-indigo-700 dark:from-indigo-950 dark:to-fuchsia-950/30 dark:text-indigo-300" : "text-gray-500 dark:text-gray-400"
          }`}
        >
          <User size={15} /> Profesores ({profesores.length})
        </button>
        <button
          onClick={() => setTab("ESTUDIANTE")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
            tab === "ESTUDIANTE" ? "bg-gradient-to-r from-indigo-50 to-fuchsia-50 text-indigo-700 dark:from-indigo-950 dark:to-fuchsia-950/30 dark:text-indigo-300" : "text-gray-500 dark:text-gray-400"
          }`}
        >
          <GraduationCap size={15} /> Estudiantes ({estudiantes.length})
        </button>
      </div>

      {lista.length === 0 ? (
        <EmptyState
          icon={Users2}
          title={tab === "PROFESOR" ? "Todavía no tienes profesores" : "Todavía no tienes estudiantes"}
          description="Agrégalos con el formulario de arriba."
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {lista.map((u) => (
            <TarjetaPersona key={u.id} persona={u} token={token} alCambiar={cargar} />
          ))}
        </div>
      )}
    </div>
  );
}

// RF-17 · HU-17: editar nombre y correo, y desactivar o reactivar. Nadie se
// borra: el historial de reservas, asistencias y pagos se conserva.
function TarjetaPersona({ persona, token, alCambiar }) {
  const [editando, setEditando] = useState(false);
  const [datos, setDatos] = useState({ nombre: persona.nombre, email: persona.email });
  const [guardando, setGuardando] = useState(false);

  async function guardar(cambios, mensaje) {
    setGuardando(true);
    try {
      await api.patch(`/usuarios/${persona.id}`, cambios, token);
      toast.success(mensaje);
      setEditando(false);
      await alCambiar();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  }

  const botonIcono = "text-gray-300 hover:text-indigo-600 transition disabled:opacity-40";

  return (
    <Card hover={!editando}>
      <CardBody className={`pt-5 ${persona.activo ? "" : "opacity-60"}`}>
        <div className="flex items-start justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white font-semibold text-sm">
            {persona.nombre.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex items-center gap-2">
            {persona.activo ? <Badge color="indigo">{persona.rol === "PROFESOR" ? "Profesor" : "Estudiante"}</Badge> : <Badge>Inactivo</Badge>}
            <button type="button" onClick={() => setEditando((v) => !v)} className={botonIcono} title="Editar" disabled={guardando}>
              <Pencil size={15} />
            </button>
            <button
              type="button"
              onClick={() =>
                guardar(
                  { activo: !persona.activo },
                  persona.activo ? `${persona.nombre} quedó desactivado.` : `${persona.nombre} quedó activo de nuevo.`
                )
              }
              className={botonIcono}
              title={persona.activo ? "Desactivar" : "Reactivar"}
              disabled={guardando}
            >
              <Power size={15} />
            </button>
          </div>
        </div>

        {editando ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              guardar(datos, "Datos actualizados.");
            }}
            className="mt-3 space-y-2"
          >
            <Campo label="Nombre" value={datos.nombre} onChange={(e) => setDatos({ ...datos, nombre: e.target.value })} />
            <Campo label="Correo" type="email" value={datos.email} onChange={(e) => setDatos({ ...datos, email: e.target.value })} />
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={guardando}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                Guardar
              </button>
              <button
                type="button"
                onClick={() => {
                  setDatos({ nombre: persona.nombre, email: persona.email });
                  setEditando(false);
                }}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <>
            <p className="font-medium text-gray-900 dark:text-gray-100 mt-3">{persona.nombre}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{persona.email}</p>
          </>
        )}
      </CardBody>
    </Card>
  );
}

function Campo({ label, type = "text", value, onChange }) {
  return (
    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 flex flex-col gap-1">
      {label}
      <input
        type={type}
        required
        value={value}
        onChange={onChange}
        className="rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </label>
  );
}
