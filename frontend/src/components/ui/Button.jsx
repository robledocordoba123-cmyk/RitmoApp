import { motion } from "framer-motion";

const VARIANTES = {
  primary: "bg-gradient-to-r from-indigo-600 to-fuchsia-500 text-white hover:from-indigo-700 hover:to-fuchsia-600 shadow-sm shadow-indigo-200 dark:shadow-none",
  secondary: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-800",
  danger: "bg-white text-red-600 border border-red-200 hover:bg-red-50 dark:bg-gray-900 dark:border-red-900 dark:hover:bg-red-950",
  ghost: "text-gray-500 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800",
};

export default function Button({ variant = "primary", icon: Icon, className = "", children, ...props }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed ${VARIANTES[variant]} ${className}`}
    >
      {Icon && <Icon size={16} />}
      {children}
    </motion.button>
  );
}
