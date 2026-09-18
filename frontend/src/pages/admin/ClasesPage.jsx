import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

const VACIO = { ritmoId: "", salonId: "", profesorId: "", cupoMaximo: "", fecha: "", horaInicio: "", horaFin: "" };

export default function ClasesPage() {
  const { token } = useAuth();
  const [clases, setClases] = useState([]);
  const [salones, setSalones] = useState([]);
  const [ritmos, setRitmos] = useState([]);
  const [profesores, setProfesores] = useState([]);
  const [form, setForm] = useState(VACIO);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);

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
    setCargando(false);
  }

  useEffect(() => {
    cargarTodo();
  }, []);

  function cambiar(campo) {
    return (e) => setForm((prev) => ({ ...prev, [campo]: e.target.value }));
  }

  async function crear(e) {
    e.preventDefault();
    setError("");
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
      await cargarTodo();
    } catch (err) {
      setError(err.message);
    }
  }

  async function cancelar(id) {
    try {
      await api.patch(`/clases/${id}/cancelar`, {}, token);
      await cargarTodo();
    } catch (err) {
      setError(err.message);
    }
  }

  if (cargando) return <p className="text-gray-500">Cargando...</p>;

  const faltaCatalogoBase = salones.length === 0 || ritmos.length === 0 || profesores.length === 0;

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900 mb-4">Clases</h1>

      {faltaCatalogoBase && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-4">
          Antes de programar una clase necesitas al menos un salón, un ritmo y un profesor registrado.
        </p>
      )}

      {!faltaCatalogoBase && (
        <form onSubmit={crear} className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6 bg-white p-4 rounded-lg border border-gray-200">
          <Select label="Ritmo" value={form.ritmoId} onChange={cambiar("ritmoId")} opciones={ritmos} />
          <Select label="Salón" value={form.salonId} onChange={cambiar("salonId")} opciones={salones} />
          <Select label="Profesor" value={form.profesorId} onChange={cambiar("profesorId")} opciones={profesores} />
          <Campo label="Cupo máximo" type="number" min="1" value={form.cupoMaximo} onChange={cambiar("cupoMaximo")} />
          <Campo label="Fecha" type="date" value={form.fecha} onChange={cambiar("fecha")} />
          <Campo label="Hora inicio" type="time" value={form.horaInicio} onChange={cambiar("horaInicio")} />
          <Campo label="Hora fin" type="time" value={form.horaFin} onChange={cambiar("horaFin")} />
          <div className="col-span-2 sm:col-span-3">
            <button type="submit" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
              Programar clase
            </button>
          </div>
        </form>
      )}

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <ul className="divide-y divide-gray-200 bg-white rounded-lg border border-gray-200">
        {clases.map((c) => (
          <li key={c.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="font-medium text-gray-900">
                {c.ritmo.nombre} · {c.salon.nombre}
              </p>
              <p className="text-sm text-gray-500">
                {new Date(c.fechaHoraInicio).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })} · Profesor:{" "}
                {c.profesor.nombre}
              </p>
              <p className="text-sm text-gray-500">
                Cupos: {c.cuposDisponibles}/{c.cupoMaximo} · Estado: {c.estado}
              </p>
            </div>
            {c.estado === "PROGRAMADA" && (
              <button onClick={() => cancelar(c.id)} className="text-sm text-red-600 hover:text-red-800">
                Cancelar
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Campo({ label, ...props }) {
  return (
    <label className="text-xs text-gray-600 flex flex-col gap-1">
      {label}
      <input {...props} required className="rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
    </label>
  );
}

function Select({ label, value, onChange, opciones }) {
  return (
    <label className="text-xs text-gray-600 flex flex-col gap-1">
      {label}
      <select value={value} onChange={onChange} required className="rounded-md border border-gray-300 px-2 py-1.5 text-sm">
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
