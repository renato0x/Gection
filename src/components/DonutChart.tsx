import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const PALETTE = [
  '#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd',  // indigo/purple range
  '#14b8a6', '#2dd4bf', '#5eead4',               // teal range
  '#f59e0b', '#fbbf24',                           // amber range
  '#ec4899', '#f472b6',                           // pink range
  '#06b6d4', '#22d3ee',                           // cyan range
  '#84cc16', '#a3e635',                           // lime range
  '#f97316', '#fb923c',                           // orange range
];

interface Props {
  data: { name: string; value: number; color?: string }[];
  size?: number;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 shadow-lg">
      <p className="text-xs font-medium text-slate-300">{d.name}</p>
      <p className="text-xs font-bold text-slate-100 mt-0.5">
        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(d.value)}
        <span className="text-slate-500 font-normal ml-1">({d.percent}%)</span>
      </p>
    </div>
  );
}

export function DonutChart({ data, size = 180 }: Props) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  const innerR = size * 0.32;
  const outerR = size * 0.48;

  return (
    <div style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%" cy="50%"
            innerRadius={innerR}
            outerRadius={outerR}
            strokeWidth={0}
            cornerRadius={2}
            paddingAngle={2}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color || PALETTE[i % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
