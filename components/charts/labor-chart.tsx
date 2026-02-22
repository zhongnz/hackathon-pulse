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
} from "recharts"
import { formatCurrency } from "@/lib/utils"

interface LaborChartProps {
  data: Array<{
    sovLineId: string
    budgetedLaborCost: number
    actualLaborCost: number
    variance: number
  }>
  projectId: string
}

export function LaborChart({ data, projectId }: LaborChartProps) {
  const chartData = data.slice(0, 10).map((d) => ({
    name: d.sovLineId.replace(`${projectId}-`, ""),
    budget: Math.round(d.budgetedLaborCost / 1000),
    actual: Math.round(d.actualLaborCost / 1000),
  }))

  return (
    <div className="my-2 rounded-lg border border-border bg-card/50 p-3">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        Labor: Budget vs Actual by SOV Line (in $K)
      </div>
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barGap={2}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(224, 15%, 18%)"
            />
            <XAxis
              dataKey="name"
              tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 10 }}
              axisLine={{ stroke: "hsl(224, 15%, 18%)" }}
              angle={-30}
              textAnchor="end"
              height={50}
            />
            <YAxis
              tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 11 }}
              axisLine={{ stroke: "hsl(224, 15%, 18%)" }}
              tickFormatter={(v) => `$${v}K`}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(224, 25%, 10%)",
                border: "1px solid hsl(224, 15%, 18%)",
                borderRadius: "8px",
                fontSize: "12px",
                color: "hsl(210, 20%, 93%)",
              }}
              formatter={(value: number) => [`$${value}K`]}
            />
            <Legend
              wrapperStyle={{ fontSize: "11px", color: "hsl(215, 15%, 55%)" }}
            />
            <Bar
              dataKey="budget"
              name="Budget"
              fill="hsl(199, 89%, 48%)"
              radius={[2, 2, 0, 0]}
            />
            <Bar
              dataKey="actual"
              name="Actual"
              fill="#f59e0b"
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
