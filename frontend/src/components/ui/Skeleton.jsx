// Bloques grises que laten mientras llegan los datos de la API. Así la
// pantalla nunca queda en blanco (DOC-05, estados de la interfaz).
// SkeletonList arma una lista de `filas` bloques del alto de una fila.
export default function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-lg bg-gray-200/70 dark:bg-gray-800 ${className}`} />;
}

export function SkeletonList({ filas = 3 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: filas }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}
