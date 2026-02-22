"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import { formatCurrency } from "@/lib/utils"

interface ChangeOrderChartProps {
  approved: { count: number; totalValue: number }
  pending: { count: number; totalValue: number }
  denied: { count: number; totalValue: number }
  byReasonCategory: Array<{
    reason: string
    count: number
    totalAmount: number
  }>
  approvalRate: string
  projectId: string
}

const STATUS_COLORS = ["#22c55e", "#f59e0b", "#ef4444"]

export function ChangeOrderChart({
  approved,
  pending,
  denied,
  byReasonCategory,
  approvalRate,
  projectId,
}: ChangeOrderChartProps) {
  const statusData = [
    { name: "Approved", value: approved.totalValue, count: approved.count },
    { name: "Pending", value: pending.totalValue, count: pending.count },
    { name: "Denied", value: denied.totalValue, count: denied.count },
  ].filter((d) => d.count > 0)

  const reasonData = byReasonCategory.slice(0, 8).map((r) => ({
    name: r.reason.length > 18 ? r.reason.slice(0, 18) + "..." : r.reason,
    fullName: r.reason,
    amount: Math.round(r.totalAmount / 1000),
    count: r.count,
  }))

  return (
    <div className="my-2 flex flex-col gap-2 w-full">
      {/* Status pie + summary */}
      <div className="rounded-lg border border-border bg-card/50 p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Change Orders: {projectId === "ALL" ? "Portfolio-Wide" : projectId}
          </span>
          <span className="text-xs text-muted-foreground">
            Approval rate: <span className="font-semibold text-foreground">{approvalRate}</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="h-[120px] w-[120px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={50}
                  dataKey="value"
                  stroke="none"
                >
                  {statusData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "hsl(224, 25%, 10%)",
                    border: "1px solid hsl(224, 15%, 18%)",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "hsl(210, 20%, 93%)",
                  }}
                  formatter={(value: number) => [formatCurrency(value)]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col gap-2 flex-1">
            {statusData.map((s, i) => (
              <div key={s.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: STATUS_COLORS[i] }}
                  />
                  <span className="text-xs text-muted-foreground">{s.name}</span>
                  <span className="text-[10px] text-muted-foreground/50">({s.count})</span>
                </div>
                <span className="text-xs font-medium text-foreground">
                  {formatCurrency(s.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* By reason category bar chart */}
      {reasonData.length > 0 && (
        <div className="rounded-lg border border-border bg-card/50 p-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Change Orders by Reason ($K)
          </span>
          <div className="h-[180px] w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reasonData} layout="vertical" barSize={14}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(224, 15%, 18%)"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 10 }}
                  axisLine={{ stroke: "hsl(224, 15%, 18%)" }}
                  tickFormatter={(v) => `$${v}K`}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 10 }}
                  axisLine={{ stroke: "hsl(224, 15%, 18%)" }}
                  width={120}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(224, 25%, 10%)",
                    border: "1px solid hsl(224, 15%, 18%)",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "hsl(210, 20%, 93%)",
                  }}
                  formatter={(value: number, _: string, props: { payload: { count: number } }) => [
                    `$${value}K (${props.payload.count} COs)`,
                    "Amount",
                  ]}
                />
                <Bar dataKey="amount" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
