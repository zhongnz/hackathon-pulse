"use client"

import { cn, formatCurrency } from "@/lib/utils"
import { ClipboardList } from "lucide-react"

interface RFIChartProps {
  totalRFIs: number
  open: number
  closed: number
  avgResponseDays: string
  costImpacts: number
  scheduleImpacts: number
  topRFIs: Array<{
    rfiNumber: string
    subject: string
    status: string
    responseDays: number
    costImpact: number
    scheduleDays: number
  }>
  projectId: string
}

export function RFIChart({
  totalRFIs,
  open,
  closed,
  avgResponseDays,
  costImpacts,
  scheduleImpacts,
  topRFIs,
  projectId,
}: RFIChartProps) {
  return (
    <div className="my-2 rounded-lg border border-border bg-card/50 p-3 w-full">
      <div className="flex items-center gap-2 mb-3">
        <ClipboardList className="h-3.5 w-3.5 text-rose-400" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          RFI Tracker: {projectId === "ALL" ? "Portfolio" : projectId}
        </span>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-3">
        {[
          { label: "Total", value: String(totalRFIs), color: "text-foreground" },
          { label: "Open", value: String(open), color: open > 5 ? "text-amber-400" : "text-foreground" },
          { label: "Closed", value: String(closed), color: "text-emerald-400" },
          { label: "Avg Response", value: avgResponseDays, color: "text-foreground" },
          { label: "Cost Impacts", value: String(costImpacts), color: costImpacts > 0 ? "text-red-400" : "text-foreground" },
          { label: "Schedule Hits", value: String(scheduleImpacts), color: scheduleImpacts > 0 ? "text-amber-400" : "text-foreground" },
        ].map((s) => (
          <div key={s.label} className="text-center">
            <div className={cn("text-sm font-semibold", s.color)}>{s.value}</div>
            <div className="text-[10px] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Open/closed bar */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 h-3 rounded-full bg-secondary overflow-hidden flex">
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ width: totalRFIs > 0 ? `${(closed / totalRFIs) * 100}%` : "0%" }}
          />
          <div
            className="h-full bg-amber-500 transition-all"
            style={{ width: totalRFIs > 0 ? `${(open / totalRFIs) * 100}%` : "0%" }}
          />
        </div>
        <span className="text-[10px] text-muted-foreground">
          {totalRFIs > 0 ? ((closed / totalRFIs) * 100).toFixed(0) : 0}% closed
        </span>
      </div>

      {/* Top RFIs table */}
      {topRFIs.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
            Key RFIs
          </span>
          {topRFIs.slice(0, 5).map((rfi, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-md bg-secondary/30 px-2.5 py-1.5"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className={cn(
                  "h-1.5 w-1.5 rounded-full shrink-0",
                  rfi.status === "Open" || rfi.status === "Pending" ? "bg-amber-500" : "bg-emerald-500"
                )} />
                <span className="text-[10px] font-mono text-muted-foreground shrink-0">{rfi.rfiNumber}</span>
                <span className="text-xs text-foreground truncate">{rfi.subject}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-2">
                {rfi.costImpact > 0 && (
                  <span className="text-[10px] text-red-400 font-medium">
                    {formatCurrency(rfi.costImpact)}
                  </span>
                )}
                {rfi.scheduleDays > 0 && (
                  <span className="text-[10px] text-amber-400">
                    +{rfi.scheduleDays}d
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground">
                  {rfi.responseDays}d resp
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
