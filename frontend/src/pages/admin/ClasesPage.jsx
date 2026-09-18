import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { CalendarDays, Plus, XCircle, Music4, DoorOpen, User, List, CalendarRange } from "lucide-react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import EmptyState from "../../components/ui/EmptyState";
import { SkeletonList } from "../../components/ui/Skeleton";
import WeekCalendar from "../../components/WeekCalendar";

const VACIO = { ritmoId: "", salonId: "", profesorId: "", cupoMaximo: "", fecha: "", horaInicio: "", horaFin: "" };

const ESTADO_BADGE = { PROGRAMADA: "green", CANCELADA: "red", FINALIZADA: "gray" };

export default function ClasesPage() {
  const { token } = useAuth();
  const [clases, setClases] = useState(null);
  const [salones, setSalones] = useState([]);
  const [ritmos, setRitmos] = useState([]);
  const [profesores, setProfesores] = useState([]);
  const [form, setForm] = useState(VACIO);
  const [enviando, setEnviando] = useState(false);
  const [vista, setVista] = useState("lista");

  async function cargarTodo() {
    const [c, s, r, p] = await Promise.all([
      api.get("/clases", token),
      api.get("/salones", token),
      api.get("/ritmos", token),
      api.get("/usuarios?rol=PROFESOR", token),
    ]);
    setClases(c);
    setSalones(s);
    setRitmos(r);
    setProfesores(p);
  }

  useEffect(() => {
    cargarTodo();
  }, []);

  function cambiar(campo) {
    return (e) => setForm((prev) => ({ ...prev, [campo]: e.target.value }));
  }

  async function crear(e) {
    e.preventDefault();
    setEnviando(true);
    try {
      await api.post(
        "/clases",
        {
          ritmoId: form.ritmoId,
          salonId: form.salonId,
          profesorId: form.profesorId,
          cupoMaximo: Number(form.cupoMaximo),
          fechaHoraInicio: new Date(`${form.fecha}T${form.horaInicio}:00`).toISOString(),
          fechaHoraFin: new Date(`${form.fecha}T${form.horaFin}:00`).toISOString(),
        },
        token
      );
      setForm(VACIO);
      toast.success("Clase programada.");
      await cargarTodo();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setEnviando(false);
    }
  }

  async function cancelar(id) {
    try {
      await api.patch(`/clases/${id}/cancelar`, {}, token);
      toast.success("Clase cancelada.");
      await cargarTodo();
    } catch (err) {
      toast.error(err.message);
    }
  }

  if (clases === null) {
    return (
      <div>
        <PageHeader title="Clases" subtitle="Programa clases y controla su ocupación." />
        <SkeletonList />
      </div>
    );
  }

  const faltaCatalogoBase = salones.length === 0 || ritmos.length === 0 || profesores.length === 0;

  return (
    <div>
      <PageHeader
        title="Clases"
        subtitle="Programa clases y controla su ocupación."
        action={
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-800 dark:bg-gray-900">
            <button
              onClick={() => setVista("lista")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                vista === "lista" ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" : "text-gray-500 dark:text-gray-400"
              }`}
            >
              <List size={15} /> Lista
            </button>
            <button
              onClick={() => setVista("calendario")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                vista === "calendario" ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" : "text-gray-500 dark:text-gray-400"
              }`}
            >
              <CalendarRange size={15} /> Calendario
            </button>
          </div>
        }
      />

      {faltaCatalogoBase ? (
        <EmptyState
          icon={CalendarDays}
          title="Te falta configurar el catálogo base"
          description="Antes de programar una clase necesitas al menos un salón, un ritmo y un profesor registrado en tu academia."
        />
      ) : (
        <Card className="mb-6">
          <CardHeader title="Programar clase" />
          <CardBody>
            <form onSubmit={crear} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Select label="Ritmo" value={form.ritmoId} onChange={cambiar("ritmoId")} opciones={ritmos} />
              <Select label="Salón" value={form.salonId} onChange={cambiar("salonId")} opciones={salones} />
              <Select label="Profesor" value={form.profesorId} onChange={cambiar("profesorId")} opciones={profesores} />
              <Campo label="Cupo máximo" type="number" min="1" value={form.cupoMaximo} onChange={cambiar("cupoMaximo")} />
              <Campo label="Fecha" type="date" value={form.fecha} onChange={cambiar("fecha")} />
              <Campo label="Hora inicio" type="time" value={form.horaInicio} onChange={cambiar("horaInicio")} />
              <Campo label="Hora fin" type="time" value={form.horaFin} onChange={cambiar("horaFin")} />
              <div className="col-span-2 sm:col-span-3">
                <Button type="submit" icon={Plus} disabled={enviando}>
                  Programar clase
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {clases.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No hay clases programadas" />
      ) : vista === "calendario" ? (
        <WeekCalendar clases={clases} />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {clases.map((c) => {
            const ocupado = c.cupoMaximo - c.cuposDisponibles;
            const porcentaje = Math.round((ocupado / c.cupoMaximo) * 100);
            return (
              <Card key={c.id}>
                <CardBody className="pt-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{c.ritmo.nombre}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(c.fechaHoraInicio).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}
                      </p>
                    </div>
                    <Badge color={ESTADO_BADGE[c.estado]}>{c.estado}</Badge>
                  </div>

                  <div className="mt-3 space-y-1 text-sm text-gray-500 dark:text-gray-400">
                    <p className="flex items-center gap-1.5">
                      <DoorOpen size={14} /> {c.salon.nombre}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <User size={14} /> {c.profesor.nombre}
                    </p>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1 dark:text-gray-400">
                      <span>
                        {ocupado}/{c.cupoMaximo} cupos
                      </span>
                      <span>{porcentaje}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-800">
                      <div className="h-1.5 rounded-full bg-indigo-600" style={{ width: `${Math.min(porcentaje, 100)}%` }} />
                    </div>
                  </div>

                  {c.estado === "PROGRAMADA" && (
                    <button
                      onClick={() => cancelar(c.id)}
                      className="mt-4 inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-800"
                    >
                      <XCircle size={14} /> Cancelar clase
                    </button>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Campo({ label, ...props }) {
  return (
    <label className="text-xs font-medium text-gray-600 flex flex-col gap-1 dark:text-gray-400">
      {label}
      <input {...props} required className="rounded-lg border border-gray-300 px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" />
    </label>
  );
}

function Select({ label, value, onChange, opciones }) {
  return (
    <label className="text-xs font-medium text-gray-600 flex flex-col gap-1 dark:text-gray-400">
      <span className="flex items-center gap-1">
        {label === "Ritmo" && <Music4 size={12} />}
        {label === "Salón" && <DoorOpen size={12} />}
        {label === "Profesor" && <User size={12} />}
        {label}
      </span>
      <select value={value} onChange={onChange} required className="rounded-lg border border-gray-300 px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
        <option value="" disabled>
          Selecciona...
        </option>
        {opciones.map((o) => (
          <option key={o.id} value={o.id}>
            {o.nombre}
          </option>
        ))}
      </select>
    </label>
  );
}
