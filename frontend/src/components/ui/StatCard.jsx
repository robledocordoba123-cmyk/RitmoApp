import { motion } from "framer-motion";
import AnimatedNumber from "./AnimatedNumber";

export default function StatCard({ icon: Icon, label, value, hint, tone = "indigo" }) {
  const tonos = {
    indigo: "bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-sm shadow-indigo-200 dark:shadow-none",
    green: "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-200 dark:shadow-none",
    amber: "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm shadow-amber-200 dark:shadow-none",
    rose: "bg-gradient-to-br from-fuchsia-500 to-rose-500 text-white shadow-sm shadow-rose-200 dark:shadow-none",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      whileHover={{ y: -2 }}
      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
    >
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tonos[tone]}`}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100 leading-none">
            <AnimatedNumber value={value} />
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{label}</p>
        </div>
      </div>
      {hint && <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">{hint}</p>}
    </motion.div>
  );
}
