"use client"

import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/utils"
import { AlertTriangle, TrendingUp } from "lucide-react"

interface PatternsChartProps {
  patterns: {
    labor?: {
      overtimeByProject: Array<{
        projectId: string
        projectName: string
        overtimePercent: string
        totalOTHours: number
      }>
      topRolesPortfolioWide: Array<{
        role: string
        totalCost: number
        totalHours: number
        projectCount: number
      }>
    }
    changeOrders?: {
      systemicReasons: Array<{
        reason: string
        count: number
        totalAmount: number
        projectCount: number
      }>
    }
    billing?: {
      totalPortfolioBillingLag: number
      billingLagByProject: Array<{
        projectId: string
        projectName: string
        billingLag: number
        billingLagAsPercentOfContract: string
      }>
    }
  }
  focusArea: string
}

export function PatternsChart({ patterns, focusArea }: PatternsChartProps) {
  return (
    <div className="my-2 flex flex-col gap-2 w-full">
      {/* Systemic CO Reasons */}
      {patterns.changeOrders?.systemicReasons && patterns.changeOrders.systemicReasons.length > 0 && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
              Systemic Change Order Patterns (3+ Projects)
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            {patterns.changeOrders.systemicReasons.map((reason, i) => (
              <div key={i} className="flex items-center justify-between rounded-md bg-card/30 px-3 py-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-foreground">{reason.reason}</span>
                  <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-400">
                    {reason.projectCount} projects
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{reason.count} COs</span>
                  <span className="font-medium text-foreground">{formatCurrency(reason.totalAmount)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Roles */}
      {patterns.labor?.topRolesPortfolioWide && (
        <div className="rounded-lg border border-border bg-card/50 p-3">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-3.5 w-3.5 text-sky-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Highest Cost Roles Across Portfolio
            </span>
          </div>
          <div className="flex flex-col gap-1">
            {patterns.labor.topRolesPortfolioWide.slice(0, 5).map((role, i) => (
              <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-border/50 last:border-0">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-[10px] font-mono w-4 text-center",
                    i === 0 ? "text-red-400" : i < 3 ? "text-amber-400" : "text-muted-foreground"
                  )}>
                    {i + 1}
                  </span>
                  <span className="text-foreground font-medium">{role.role}</span>
                  <span className="text-muted-foreground/50">{role.projectCount} projects</span>
                </div>
                <span className="font-medium text-foreground">{formatCurrency(role.totalCost)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overtime by project */}
      {patterns.labor?.overtimeByProject && (
        <div className="rounded-lg border border-border bg-card/50 p-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Overtime Rates by Project
          </span>
          <div className="mt-2 flex flex-col gap-1.5">
            {patterns.labor.overtimeByProject.map((proj, i) => {
              const pct = parseFloat(proj.overtimePercent)
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-24 truncate">{proj.projectName.split(" - ")[0]}</span>
                  <div className="flex-1 h-3 rounded-full bg-secondary overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        pct > 20 ? "bg-red-500" : pct > 12 ? "bg-amber-500" : "bg-emerald-500"
                      )}
                      style={{ width: `${Math.min(pct * 3, 100)}%` }}
                    />
                  </div>
                  <span className={cn(
                    "text-[10px] font-medium w-10 text-right",
                    pct > 20 ? "text-red-400" : pct > 12 ? "text-amber-400" : "text-emerald-400"
                  )}>
                    {proj.overtimePercent}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
