// Formatos que se repiten en las pantallas de pagos y reportes.
const PESOS = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

export function pesos(valor) {
  return PESOS.format(valor);
}

export function fecha(valor) {
  return new Date(valor).toLocaleDateString("es-CO", { dateStyle: "medium" });
}

export const MEDIOS_DE_PAGO = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
  TARJETA: "Tarjeta",
  OTRO: "Otro",
};

// Texto y color del estado de membresía (RN-05) para Badge.
export const ESTADOS_MEMBRESIA = {
  AL_DIA: { texto: "Al día", color: "green" },
  VENCIDA: { texto: "Vencida", color: "red" },
  SIN_PAGOS: { texto: "Sin pagos", color: "amber" },
};
