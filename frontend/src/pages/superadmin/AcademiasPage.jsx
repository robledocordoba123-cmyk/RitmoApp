import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

export default function AcademiasPage() {
  const { token } = useAuth();
  const [academias, setAcademias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  async function cargar() {
    setAcademias(await api.get("/superadmin/tenants", token));
    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  async function cambiarEstado(id, estado) {
    setError("");
    try {
      await api.patch(`/superadmin/tenants/${id}/estado`, { estado }, token);
      await cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  if (cargando) return <p className="text-gray-500">Cargando...</p>;

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900 mb-4">Academias registradas</h1>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <ul className="divide-y divide-gray-200 bg-white rounded-lg border border-gray-200">
        {academias.map((t) => (
          <li key={t.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="font-medium text-gray-900">{t.nombre}</p>
              <p className="text-sm text-gray-500">
                NIT {t.nit} · {t._count.usuarios} usuarios
              </p>
              <span
                className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded ${
                  t.estado === "ACTIVA" ? "text-green-700 bg-green-50" : "text-red-700 bg-red-50"
                }`}
              >
                {t.estado}
              </span>
            </div>
            <button
              onClick={() => cambiarEstado(t.id, t.estado === "ACTIVA" ? "SUSPENDIDA" : "ACTIVA")}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
            >
              {t.estado === "ACTIVA" ? "Suspender" : "Reactivar"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
