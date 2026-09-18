import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

export default function CatalogoPage() {
  const { token } = useAuth();
  const [clases, setClases] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState(null);
  const [reservandoId, setReservandoId] = useState(null);

  async function cargar() {
    setCargando(true);
    const data = await api.get("/clases", token);
    setClases(data);
    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  async function reservar(claseId) {
    setMensaje(null);
    setReservandoId(claseId);
    try {
      await api.post("/reservas", { claseId }, token);
      setMensaje({ tipo: "ok", texto: "Reserva confirmada." });
      await cargar();
    } catch (err) {
      setMensaje({ tipo: "error", texto: err.message });
    } finally {
      setReservandoId(null);
    }
  }

  if (cargando) return <p className="text-gray-500">Cargando catálogo...</p>;

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900 mb-4">Catálogo de clases</h1>

      {mensaje && (
        <p className={`mb-4 text-sm ${mensaje.tipo === "ok" ? "text-green-600" : "text-red-600"}`}>{mensaje.texto}</p>
      )}

      {clases.length === 0 ? (
        <p className="text-sm text-gray-500">No hay clases programadas todavía.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {clases.map((clase) => (
            <div key={clase.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="font-medium text-gray-900">{clase.ritmo.nombre}</p>
              <p className="text-sm text-gray-500">{clase.salon.nombre} · Profesor: {clase.profesor.nombre}</p>
              <p className="text-sm text-gray-500">
                {new Date(clase.fechaHoraInicio).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}
              </p>
              <p className="text-sm text-gray-700 mt-1">
                Cupos disponibles: <span className="font-medium">{clase.cuposDisponibles}</span> / {clase.cupoMaximo}
              </p>
              <button
                onClick={() => reservar(clase.id)}
                disabled={clase.cuposDisponibles === 0 || reservandoId === clase.id}
                className="mt-3 w-full rounded-md bg-indigo-600 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40"
              >
                {clase.cuposDisponibles === 0 ? "Sin cupos" : reservandoId === clase.id ? "Reservando..." : "Reservar"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
