export default function StatCard({ icon: Icon, label, value, hint, tone = "indigo" }) {
  const tonos = {
    indigo: "bg-indigo-50 text-indigo-600",
    green: "bg-green-50 text-green-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600",
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tonos[tone]}`}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-2xl font-semibold text-gray-900 leading-none">{value}</p>
          <p className="text-sm text-gray-500 mt-1">{label}</p>
        </div>
      </div>
      {hint && <p className="text-xs text-gray-400 mt-3">{hint}</p>}
    </div>
  );
}
