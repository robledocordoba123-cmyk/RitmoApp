import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

export default function SalonesPage() {
  const { token } = useAuth();
  const [salones, setSalones] = useState([]);
  const [nombre, setNombre] = useState("");
  const [capacidad, setCapacidad] = useState("");
  const [error, setError] = useState("");

  async function cargar() {
    setSalones(await api.get("/salones", token));
  }

  useEffect(() => {
    cargar();
  }, []);

  async function crear(e) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/salones", { nombre, capacidad: Number(capacidad) }, token);
      setNombre("");
      setCapacidad("");
      await cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  async function eliminar(id) {
    try {
      await api.delete(`/salones/${id}`, token);
      await cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900 mb-4">Salones</h1>

      <form onSubmit={crear} className="flex gap-2 mb-6">
        <input
          placeholder="Nombre del salón"
          required
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          type="number"
          min="1"
          placeholder="Capacidad"
          required
          value={capacidad}
          onChange={(e) => setCapacidad(e.target.value)}
          className="w-32 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          Agregar
        </button>
      </form>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <ul className="divide-y divide-gray-200 bg-white rounded-lg border border-gray-200">
        {salones.map((s) => (
          <li key={s.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="font-medium text-gray-900">{s.nombre}</p>
              <p className="text-sm text-gray-500">Capacidad: {s.capacidad}</p>
            </div>
            <button onClick={() => eliminar(s.id)} className="text-sm text-red-600 hover:text-red-800">
              Eliminar
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
