"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts"
import { formatCurrency } from "@/lib/utils"

interface ForecastChartProps {
  projectName: string
  currentState: {
    currentBidMargin: string
    currentRealizedMargin: string
  }
  scenarios: Array<{
    scenario: string
    projectedCost: number
    adjustedContract: number
    projectedMargin: string
  }>
  recoveryPotential: {
    pendingCOs: number
    billingLagRecovery: number
    total: number
    marginImpactIfRecovered: string
  }
}

export function ForecastChart({
  projectName,
  currentState,
  scenarios,
  recoveryPotential,
}: ForecastChartProps) {
  const bidMargin = parseFloat(currentState.currentBidMargin)

  const data = scenarios.map((s, i) => {
    const labels = ["Best Case", "Expected", "Worst Case"]
    return {
      name: labels[i] || s.scenario.split("(")[0].trim(),
      margin: parseFloat(s.projectedMargin),
      cost: s.projectedCost,
      contract: s.adjustedContract,
    }
  })

  const barColors = ["#22c55e", "#f59e0b", "#ef4444"]

  return (
    <div className="my-2 rounded-lg border border-border bg-card/50 p-3">
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Margin Forecast: {projectName}
        </div>
      </div>

      <div className="h-[180px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={8}>
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
              domain={["auto", "auto"]}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(224, 25%, 10%)",
                border: "1px solid hsl(224, 15%, 18%)",
                borderRadius: "8px",
                fontSize: "12px",
                color: "hsl(210, 20%, 93%)",
              }}
              formatter={(value: string | number | (string | number)[]) => [
                `${Number(value).toFixed(1)}%`,
                "Projected Margin",
              ]}
            />
            <ReferenceLine
              y={bidMargin}
              stroke="hsl(199, 89%, 48%)"
              strokeDasharray="5 5"
              label={{
                value: `Bid: ${bidMargin.toFixed(1)}%`,
                position: "right",
                fill: "hsl(199, 89%, 48%)",
                fontSize: 10,
              }}
            />
            <Bar dataKey="margin" radius={[4, 4, 0, 0]}>
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={barColors[index]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recovery potential summary */}
      <div className="mt-2 flex items-center gap-4 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
        <div className="flex flex-col">
          <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
            Recovery Potential
          </span>
          <span className="text-sm font-semibold text-emerald-300">
            {formatCurrency(recoveryPotential.total)}
          </span>
        </div>
        <div className="h-6 w-px bg-emerald-500/20" />
        <div className="flex gap-3 text-[10px] text-muted-foreground">
          <span>Pending COs: {formatCurrency(recoveryPotential.pendingCOs)}</span>
          <span>Billing Lag: {formatCurrency(recoveryPotential.billingLagRecovery)}</span>
        </div>
      </div>
    </div>
  )
}
