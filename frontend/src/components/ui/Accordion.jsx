import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

export default function AccordionItem({ pregunta, respuesta }) {
  const [abierta, setAbierta] = useState(false);
  return (
    <div className="border-b border-gray-100 dark:border-gray-800 py-4 last:border-0">
      <button onClick={() => setAbierta((a) => !a)} className="w-full flex items-center justify-between text-left gap-4">
        <span className="font-medium text-gray-900 dark:text-gray-100">{pregunta}</span>
        <motion.span animate={{ rotate: abierta ? 180 : 0 }} transition={{ duration: 0.2 }} className="shrink-0">
          <ChevronDown size={18} className="text-gray-400" />
        </motion.span>
      </button>
      <motion.div
        initial={false}
        animate={{ height: abierta ? "auto" : 0, opacity: abierta ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden"
      >
        <p className="text-sm text-gray-500 dark:text-gray-400 pt-2 pr-8">{respuesta}</p>
      </motion.div>
    </div>
  );
}
