import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";
import { QrCode, X } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import Button from "./ui/Button";

// Asistencia con QR: botón "Mostrar mi QR" de una reserva. El código lo firma
// la API (GET /qr/reservas/:id); aquí solo se dibuja para que el profesor lo
// escanee. Vence al final del día de la clase.
export default function CodigoQR({ reserva }) {
  const { token } = useAuth();
  const [abierto, setAbierto] = useState(false);
  const [imagen, setImagen] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!abierto) return;
    let vigente = true;
    api
      .get(`/qr/reservas/${reserva.id}`, token)
      .then(({ codigo }) => QRCode.toDataURL(codigo, { width: 280, margin: 2, errorCorrectionLevel: "M" }))
      .then((url) => vigente && setImagen(url))
      .catch((err) => vigente && setError(err.message));
    return () => {
      vigente = false;
    };
  }, [abierto, reserva.id, token]);

  function abrir() {
    setImagen(null);
    setError("");
    setAbierto(true);
  }

  return (
    <>
      <Button variant="secondary" icon={QrCode} onClick={abrir}>
        Mostrar mi QR
      </Button>

      {/* Se dibuja en <body>: dentro de la tarjeta animada, "fixed" quedaría
          atrapado en la tarjeta y el fondo oscuro no cubriría la pantalla. */}
      {abierto &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Mi código QR">
            <div className="w-full max-w-xs rounded-2xl bg-white p-5 text-center shadow-xl dark:bg-gray-900">
              <div className="flex items-center justify-between mb-3">
                <p className="font-medium text-gray-900 dark:text-gray-100">{reserva.clase.ritmo.nombre}</p>
                <button type="button" onClick={() => setAbierto(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Cerrar">
                  <X size={18} />
                </button>
              </div>
              {error ? (
                <p className="text-sm text-red-600 py-8">{error}</p>
              ) : imagen ? (
                <img src={imagen} alt="Código QR de tu reserva" className="mx-auto rounded-lg bg-white" width={280} height={280} />
              ) : (
                <div className="mx-auto h-[280px] w-[280px] animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
              )}
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Muéstrale este código a tu profesor al llegar a la clase.</p>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
