import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

export default function RitmosPage() {
  const { token } = useAuth();
  const [ritmos, setRitmos] = useState([]);
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState("");

  async function cargar() {
    setRitmos(await api.get("/ritmos", token));
  }

  useEffect(() => {
    cargar();
  }, []);

  async function crear(e) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/ritmos", { nombre }, token);
      setNombre("");
      await cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  async function eliminar(id) {
    try {
      await api.delete(`/ritmos/${id}`, token);
      await cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900 mb-4">Ritmos</h1>

      <form onSubmit={crear} className="flex gap-2 mb-6">
        <input
          placeholder="Nombre del ritmo (ej. Salsa)"
          required
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          Agregar
        </button>
      </form>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <ul className="divide-y divide-gray-200 bg-white rounded-lg border border-gray-200">
        {ritmos.map((r) => (
          <li key={r.id} className="flex items-center justify-between px-4 py-3">
            <p className="font-medium text-gray-900">{r.nombre}</p>
            <button onClick={() => eliminar(r.id)} className="text-sm text-red-600 hover:text-red-800">
              Eliminar
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
