export default function StatCard({ icon: Icon, label, value, hint, tone = "indigo" }) {
  const tonos = {
    indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400",
    green: "bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
    rose: "bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400",
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tonos[tone]}`}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100 leading-none">{value}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{label}</p>
        </div>
      </div>
      {hint && <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">{hint}</p>}
    </div>
  );
}
