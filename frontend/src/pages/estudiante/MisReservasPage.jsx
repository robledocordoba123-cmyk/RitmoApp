import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

export default function MisReservasPage() {
  const { token } = useAuth();
  const [reservas, setReservas] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    api.get("/reservas/mias", token).then((data) => {
      setReservas(data);
      setCargando(false);
    });
  }, []);

  if (cargando) return <p className="text-gray-500">Cargando...</p>;

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900 mb-4">Mis reservas</h1>
      {reservas.length === 0 ? (
        <p className="text-sm text-gray-500">Todavía no tienes reservas.</p>
      ) : (
        <ul className="space-y-2">
          {reservas.map((r) => (
            <li key={r.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="font-medium text-gray-900">{r.clase.ritmo.nombre}</p>
              <p className="text-sm text-gray-500">{r.clase.salon.nombre}</p>
              <p className="text-sm text-gray-500">
                {new Date(r.clase.fechaHoraInicio).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}
              </p>
              <span className="inline-block mt-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded">
                {r.estado}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
