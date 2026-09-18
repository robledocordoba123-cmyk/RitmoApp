const COLORES = {
  gray: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  green: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400",
  red: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  indigo: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
};

export default function Badge({ color = "gray", children }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${COLORES[color]}`}>
      {children}
    </span>
  );
}
