import { useState } from "react";
import { MailCheck } from "lucide-react";
import { api } from "../api/client";

// HU-06-CA-03: pedir otro enlace de confirmación cuando el anterior venció o
// no llegó. Se usa en el registro, en el login y en la página del enlace.
export default function ReenviarConfirmacion({ email }) {
  const [estado, setEstado] = useState("listo");
  const [mensaje, setMensaje] = useState("");

  async function reenviar() {
    setEstado("enviando");
    try {
      const respuesta = await api.post("/auth/reenviar-confirmacion", { email });
      setMensaje(respuesta.mensaje);
      setEstado("enviado");
    } catch (err) {
      setMensaje(err.message);
      setEstado("listo");
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => void reenviar()}
        disabled={estado !== "listo" || !email}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 disabled:opacity-50"
      >
        <MailCheck size={15} /> {estado === "enviando" ? "Enviando..." : "Reenviar correo de confirmación"}
      </button>
      {mensaje && <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{mensaje}</p>}
    </div>
  );
}
