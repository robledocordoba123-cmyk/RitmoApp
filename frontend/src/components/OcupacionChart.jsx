import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from "recharts";
import { useTheme } from "../context/ThemeContext";

// Hue secuencial validado (dataviz skill: references/palette.md) para una
// sola serie de magnitud — no hay identidad categórica que codificar aquí,
// el nombre del salón ya va en el eje.
const AZUL = { claro: "#2a78d6", oscuro: "#3987e5" };

function TooltipPersonalizado({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-md dark:border-gray-700 dark:bg-gray-800">
      <p className="font-medium text-gray-900 dark:text-gray-100">{d.salon}</p>
      <p className="text-gray-500 dark:text-gray-400 mt-0.5">
        {d.reservasConfirmadas} de {d.capacidadOfertada} cupos · {d.totalClases} clases
      </p>
      <p className="font-semibold text-gray-900 dark:text-gray-100 mt-1">{d.porcentajeOcupacion}% ocupado</p>
    </div>
  );
}

export default function OcupacionChart({ datos }) {
  const { tema } = useTheme();
  const color = tema === "oscuro" ? AZUL.oscuro : AZUL.claro;
  const colorTexto = tema === "oscuro" ? "#9ca3af" : "#6b7280";
  const colorGrid = tema === "oscuro" ? "#27272a" : "#f3f4f6";

  const alturaPorFila = 40;
  const altura = Math.max(datos.length * alturaPorFila + 40, 140);

  return (
    <ResponsiveContainer width="100%" height={altura}>
      <BarChart data={datos} layout="vertical" margin={{ top: 8, right: 36, bottom: 8, left: 8 }} barCategoryGap={10}>
        <CartesianGrid horizontal={false} stroke={colorGrid} />
        <XAxis
          type="number"
          domain={[0, 100]}
          ticks={[0, 25, 50, 75, 100]}
          tickFormatter={(v) => `${v}%`}
          tick={{ fill: colorTexto, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="salon"
          width={110}
          tick={{ fill: colorTexto, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<TooltipPersonalizado />} cursor={{ fill: tema === "oscuro" ? "#ffffff08" : "#00000006" }} />
        <Bar dataKey="porcentajeOcupacion" fill={color} radius={[0, 4, 4, 0]} maxBarSize={24}>
          <LabelList
            dataKey="porcentajeOcupacion"
            position="right"
            formatter={(v) => `${v}%`}
            style={{ fill: colorTexto, fontSize: 12, fontWeight: 500 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
