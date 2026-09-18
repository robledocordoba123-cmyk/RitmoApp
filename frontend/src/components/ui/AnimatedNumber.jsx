import { useEffect, useRef } from "react";
import { useMotionValue, useTransform, animate, motion } from "framer-motion";

export default function AnimatedNumber({ value }) {
  const motionValue = useMotionValue(0);
  const redondeado = useTransform(motionValue, (v) => Math.round(v).toLocaleString("es-CO"));
  const yaAnimo = useRef(false);

  useEffect(() => {
    // Solo se anima la primera vez que aparece el número; si el valor
    // cambia después (por ejemplo al refrescar datos), salta directo.
    if (!yaAnimo.current) {
      const controles = animate(motionValue, value, { duration: 0.8, ease: "easeOut" });
      yaAnimo.current = true;
      return () => controles.stop();
    }
    motionValue.set(value);
  }, [value]);

  return <motion.span>{redondeado}</motion.span>;
}
