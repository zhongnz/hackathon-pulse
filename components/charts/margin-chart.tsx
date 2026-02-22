"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts"

interface MarginChartProps {
  projects: Array<{
    projectId: string
    projectName: string
    bidMargin: string
    realizedMargin: string
    riskRating: string
  }>
}

const riskBarColors = {
  red: "#ef4444",
  yellow: "#f59e0b",
  green: "#22c55e",
}

export function MarginChart({ projects }: MarginChartProps) {
  const data = projects.map((p) => ({
    name: p.projectId.replace("PRJ-2024-00", "P"),
    fullName: p.projectName,
    bid: parseFloat(p.bidMargin),
    realized: parseFloat(p.realizedMargin),
    risk: p.riskRating as keyof typeof riskBarColors,
  }))

  return (
    <div className="my-2 rounded-lg border border-border bg-card/50 p-3">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        Bid vs Realized Margin by Project
      </div>
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={2}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(224, 15%, 18%)"
            />
            <XAxis
              dataKey="name"
              tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 11 }}
              axisLine={{ stroke: "hsl(224, 15%, 18%)" }}
            />
            <YAxis
              tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 11 }}
              axisLine={{ stroke: "hsl(224, 15%, 18%)" }}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(224, 25%, 10%)",
                border: "1px solid hsl(224, 15%, 18%)",
                borderRadius: "8px",
                fontSize: "12px",
                color: "hsl(210, 20%, 93%)",
              }}
              formatter={(value: string | number | (string | number)[]) => [`${Number(value).toFixed(1)}%`]}
            />
            <Legend
              wrapperStyle={{ fontSize: "11px", color: "hsl(215, 15%, 55%)" }}
            />
            <Bar dataKey="bid" name="Bid Margin" fill="hsl(199, 89%, 48%)" radius={[2, 2, 0, 0]} />
            <Bar dataKey="realized" name="Realized Margin" radius={[2, 2, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={riskBarColors[entry.risk]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
