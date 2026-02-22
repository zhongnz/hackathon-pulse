"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { cn, formatCurrency } from "@/lib/utils"
import { Package } from "lucide-react"

interface MaterialChartProps {
  totalSpend: number
  deliveryCount: number
  issueCount: number
  topVendors: Array<{
    vendor: string
    totalCost: number
    deliveries: number
  }>
  topMaterials: Array<{
    materialType: string
    totalCost: number
    count: number
  }>
  projectId: string
}

export function MaterialChart({
  totalSpend,
  deliveryCount,
  issueCount,
  topVendors,
  topMaterials,
  projectId,
}: MaterialChartProps) {
  const vendorData = topVendors.slice(0, 6).map((v) => ({
    name: v.vendor.length > 16 ? v.vendor.slice(0, 16) + "..." : v.vendor,
    cost: Math.round(v.totalCost / 1000),
    deliveries: v.deliveries,
  }))

  return (
    <div className="my-2 flex flex-col gap-2 w-full">
      {/* Summary */}
      <div className="rounded-lg border border-border bg-card/50 p-3">
        <div className="flex items-center gap-2 mb-2">
          <Package className="h-3.5 w-3.5 text-violet-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Material Analysis: {projectId === "ALL" ? "Portfolio" : projectId}
          </span>
        </div>
        <div className="flex gap-4 mb-3">
          <div>
            <div className="text-lg font-bold text-foreground">{formatCurrency(totalSpend)}</div>
            <div className="text-[10px] text-muted-foreground">Total Spend</div>
          </div>
          <div>
            <div className="text-lg font-bold text-foreground">{deliveryCount}</div>
            <div className="text-[10px] text-muted-foreground">Deliveries</div>
          </div>
          <div>
            <div className={cn("text-lg font-bold", issueCount > 5 ? "text-red-400" : "text-foreground")}>
              {issueCount}
            </div>
            <div className="text-[10px] text-muted-foreground">Issues</div>
          </div>
        </div>

        {/* Top materials breakdown */}
        {topMaterials.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              By Material Type
            </span>
            {topMaterials.slice(0, 5).map((m, i) => {
              const pct = totalSpend > 0 ? (m.totalCost / totalSpend) * 100 : 0
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-28 truncate">
                    {m.materialType}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-violet-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-medium text-foreground w-16 text-right">
                    {formatCurrency(m.totalCost)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Vendor spend chart */}
      {vendorData.length > 0 && (
        <div className="rounded-lg border border-border bg-card/50 p-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Top Vendors by Spend ($K)
          </span>
          <div className="h-[160px] w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={vendorData} layout="vertical" barSize={14}>
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
                  width={110}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(224, 25%, 10%)",
                    border: "1px solid hsl(224, 15%, 18%)",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "hsl(210, 20%, 93%)",
                  }}
                  formatter={(value: number) => [`$${value}K`, "Spend"]}
                />
                <Bar dataKey="cost" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
