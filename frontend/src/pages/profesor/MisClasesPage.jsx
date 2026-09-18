import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

export default function MisClasesPage() {
  const { token, usuario } = useAuth();
  const [clases, setClases] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    api.get("/clases", token).then((data) => {
      // El catálogo trae las clases de toda la academia; el profesor solo
      // necesita ver las suyas.
      setClases(data.filter((c) => c.profesor.id === usuario.id));
      setCargando(false);
    });
  }, []);

  if (cargando) return <p className="text-gray-500">Cargando...</p>;

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900 mb-4">Mis clases</h1>
      {clases.length === 0 ? (
        <p className="text-sm text-gray-500">No tienes clases programadas.</p>
      ) : (
        <ul className="divide-y divide-gray-200 bg-white rounded-lg border border-gray-200">
          {clases.map((c) => (
            <li key={c.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-medium text-gray-900">
                  {c.ritmo.nombre} · {c.salon.nombre}
                </p>
                <p className="text-sm text-gray-500">
                  {new Date(c.fechaHoraInicio).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}
                </p>
              </div>
              <Link to={`/profesor/clases/${c.id}/asistencia`} className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
                Tomar asistencia
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
