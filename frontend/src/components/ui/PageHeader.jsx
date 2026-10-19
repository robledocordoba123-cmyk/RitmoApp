// Título y subtítulo de cada pantalla, con una acción opcional a la derecha
// (por ejemplo el selector Lista / Calendario de Clases). Mantener el mismo
// encabezado en todas las pantallas es parte del principio de consistencia
// de DOC-05.
export default function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
