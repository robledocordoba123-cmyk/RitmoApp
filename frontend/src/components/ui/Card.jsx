import { motion } from "framer-motion";

export function Card({ children, className = "", hover = false }) {
  const Componente = hover ? motion.div : "div";
  const propsHover = hover ? { whileHover: { y: -3, transition: { duration: 0.15 } } } : {};

  return (
    <Componente
      className={`rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 ${className}`}
      {...propsHover}
    >
      {children}
    </Componente>
  );
}

export function CardHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3">
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function CardBody({ children, className = "" }) {
  return <div className={`px-5 pb-5 ${className}`}>{children}</div>;
}
