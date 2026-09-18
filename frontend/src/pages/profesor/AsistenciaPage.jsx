import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

const ESTADOS = ["ASISTIO", "INASISTENCIA", "EXCUSA"];
const ETIQUETA = { ASISTIO: "Asistió", INASISTENCIA: "Inasistencia", EXCUSA: "Excusa" };

export default function AsistenciaPage() {
  const { id } = useParams();
  const { token } = useAuth();
  const [inscritos, setInscritos] = useState([]);
  const [seleccion, setSeleccion] = useState({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [guardado, setGuardado] = useState(false);

  async function cargar() {
    const data = await api.get(`/clases/${id}/inscritos`, token);
    setInscritos(data);
    setSeleccion(Object.fromEntries(data.map((i) => [i.estudianteId, i.estadoAsistencia || "ASISTIO"])));
    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  async function guardar(e) {
    e.preventDefault();
    setError("");
    setGuardado(false);
    try {
      await api.post(
        `/clases/${id}/asistencia`,
        { asistencias: Object.entries(seleccion).map(([estudianteId, estado]) => ({ estudianteId, estado })) },
        token
      );
      setGuardado(true);
      await cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  if (cargando) return <p className="text-gray-500">Cargando...</p>;

  return (
    <div>
      <Link to="/profesor/clases" className="text-sm text-gray-500 hover:text-gray-800">
        ← Volver a mis clases
      </Link>
      <h1 className="text-lg font-semibold text-gray-900 mt-2 mb-4">Registrar asistencia</h1>

      {inscritos.length === 0 ? (
        <p className="text-sm text-gray-500">Nadie ha reservado esta clase todavía.</p>
      ) : (
        <form onSubmit={guardar}>
          <ul className="divide-y divide-gray-200 bg-white rounded-lg border border-gray-200 mb-4">
            {inscritos.map((i) => (
              <li key={i.estudianteId} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-medium text-gray-900">{i.nombre}</p>
                  <p className="text-sm text-gray-500">{i.email}</p>
                </div>
                <select
                  value={seleccion[i.estudianteId]}
                  onChange={(e) => setSeleccion((prev) => ({ ...prev, [i.estudianteId]: e.target.value }))}
                  className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                >
                  {ESTADOS.map((estado) => (
                    <option key={estado} value={estado}>
                      {ETIQUETA[estado]}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>

          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
          {guardado && <p className="text-sm text-green-600 mb-4">Asistencia guardada.</p>}

          <button type="submit" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            Guardar asistencia
          </button>
        </form>
      )}
    </div>
  );
}
