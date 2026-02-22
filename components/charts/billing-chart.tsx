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
  ReferenceLine,
} from "recharts"

interface BillingChartProps {
  projects: Array<{
    projectId: string
    projectName: string
    earnedValue: number
    amountBilled: number
    billingLag: number
  }>
}

export function BillingChart({ projects }: BillingChartProps) {
  const data = projects.map((p) => ({
    name: p.projectId.replace("PRJ-2024-00", "P"),
    fullName: p.projectName,
    earned: Math.round(p.earnedValue / 1000),
    billed: Math.round(p.amountBilled / 1000),
    lag: Math.round(p.billingLag / 1000),
  }))

  return (
    <div className="my-2 rounded-lg border border-border bg-card/50 p-3">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        Billing Lag: Earned Value vs Billed ($K)
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
              formatter={(value: string | number | (string | number)[], name: string) => [
                `$${Number(value).toLocaleString()}K`,
                name,
              ]}
            />
            <Legend
              wrapperStyle={{ fontSize: "11px", color: "hsl(215, 15%, 55%)" }}
            />
            <ReferenceLine y={0} stroke="hsl(224, 15%, 18%)" />
            <Bar
              dataKey="earned"
              name="Earned Value"
              fill="hsl(199, 89%, 48%)"
              radius={[2, 2, 0, 0]}
            />
            <Bar
              dataKey="billed"
              name="Amount Billed"
              fill="#22c55e"
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
