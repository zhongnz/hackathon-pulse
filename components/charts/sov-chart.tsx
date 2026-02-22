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
import { cn } from "@/lib/utils"

interface SOVChartProps {
  lines: Array<{
    sovLineId: string
    description: string
    budgetedValue: number
    earnedToDate: number
    billedToDate: number
    percentComplete: string
    costVariance?: number
  }>
  projectId: string
}

export function SOVChart({ lines, projectId }: SOVChartProps) {
  const data = lines.slice(0, 12).map((line) => {
    const variance = line.costVariance ?? (line.earnedToDate - line.billedToDate)
    return {
      name: line.sovLineId.replace(`${projectId}-`, ""),
      desc: line.description,
      budget: Math.round(line.budgetedValue / 1000),
      earned: Math.round(line.earnedToDate / 1000),
      billed: Math.round(line.billedToDate / 1000),
      pct: parseFloat(line.percentComplete),
      variance: Math.round(variance / 1000),
    }
  })

  // Show the lines sorted by worst variance
  const sorted = [...data].sort((a, b) => a.variance - b.variance)
  const worstLines = sorted.slice(0, 8)

  return (
    <div className="my-2 flex flex-col gap-2 w-full">
      {/* Waterfall of cost variance by line */}
      <div className="rounded-lg border border-border bg-card/50 p-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          SOV Cost Variance by Line Item ($K) — {projectId}
        </div>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={worstLines} barSize={18}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(224, 15%, 18%)"
              />
              <XAxis
                dataKey="name"
                tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 9 }}
                axisLine={{ stroke: "hsl(224, 15%, 18%)" }}
                angle={-30}
                textAnchor="end"
                height={45}
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
                formatter={(value: number, _: string, props: { payload: { desc: string } }) => [
                  `$${value}K`,
                  props.payload.desc?.slice(0, 40) || "Variance",
                ]}
              />
              <ReferenceLine y={0} stroke="hsl(215, 15%, 35%)" />
              <Bar dataKey="variance" radius={[3, 3, 0, 0]}>
                {worstLines.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.variance < 0 ? "#ef4444" : "#22c55e"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Completion heatmap table */}
      <div className="rounded-lg border border-border bg-card/50 p-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Line Item Completion
        </span>
        <div className="mt-2 flex flex-col gap-1">
          {data.slice(0, 10).map((line) => (
            <div key={line.name} className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-muted-foreground w-16 shrink-0 truncate">
                {line.name}
              </span>
              <div className="flex-1 h-2.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    line.pct >= 90
                      ? "bg-emerald-500"
                      : line.pct >= 50
                        ? "bg-sky-500"
                        : "bg-amber-500"
                  )}
                  style={{ width: `${Math.min(line.pct, 100)}%` }}
                />
              </div>
              <span className="text-[10px] font-medium text-muted-foreground w-8 text-right">
                {line.pct}%
              </span>
              <span
                className={cn(
                  "text-[10px] font-medium w-14 text-right",
                  line.variance < 0 ? "text-red-400" : "text-emerald-400"
                )}
              >
                {line.variance >= 0 ? "+" : ""}${line.variance}K
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
