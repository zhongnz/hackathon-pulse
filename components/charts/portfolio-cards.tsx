"use client"

import { cn, formatCurrency } from "@/lib/utils"
import {
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react"

interface ProjectData {
  projectId: string
  projectName: string
  contractValue: number
  bidMargin: string
  realizedMargin: string
  marginErosion: string
  riskRating: string
  pendingCOs: number
  billingLag: number
  percentComplete: string
}

interface PortfolioData {
  totalContractValue: number
  blendedBidMargin: string
  blendedRealizedMargin: string
  marginGap: string
  totalPendingCOs: number
  totalBillingLag: number
  redProjects: number
  yellowProjects: number
  greenProjects: number
}

interface PortfolioCardsProps {
  portfolio?: PortfolioData
  projects: ProjectData[]
}

const riskColors = {
  red: "border-red-500/30 bg-red-500/5",
  yellow: "border-amber-500/30 bg-amber-500/5",
  green: "border-emerald-500/30 bg-emerald-500/5",
}

const riskIcons = {
  red: AlertTriangle,
  yellow: TrendingDown,
  green: CheckCircle2,
}

const riskTextColors = {
  red: "text-red-400",
  yellow: "text-amber-400",
  green: "text-emerald-400",
}

export function PortfolioCards({ portfolio, projects }: PortfolioCardsProps) {
  return (
    <div className="flex flex-col gap-3 my-2 w-full">
      {/* Portfolio Summary */}
      {portfolio && (
        <div className="rounded-lg border border-border bg-card/50 p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Portfolio Overview
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <div className="text-xs text-muted-foreground">
                Contract Value
              </div>
              <div className="text-sm font-semibold text-foreground">
                {formatCurrency(portfolio.totalContractValue)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">
                Bid Margin
              </div>
              <div className="text-sm font-semibold text-foreground">
                {portfolio.blendedBidMargin}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">
                Realized Margin
              </div>
              <div className="text-sm font-semibold text-foreground">
                {portfolio.blendedRealizedMargin}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">
                Margin Gap
              </div>
              <div className="text-sm font-semibold text-red-400">
                {portfolio.marginGap}
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-2">
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-red-500" />
              <span className="text-xs text-muted-foreground">
                {portfolio.redProjects} Critical
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-xs text-muted-foreground">
                {portfolio.yellowProjects} At Risk
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-muted-foreground">
                {portfolio.greenProjects} Healthy
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Project Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {projects.map((project) => {
          const risk = (project.riskRating as keyof typeof riskColors) || "green"
          const RiskIcon = riskIcons[risk]
          return (
            <div
              key={project.projectId}
              className={cn(
                "rounded-lg border p-3 transition-colors",
                riskColors[risk]
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-mono text-muted-foreground">
                    {project.projectId}
                  </div>
                  <div className="text-sm font-medium text-foreground truncate">
                    {project.projectName}
                  </div>
                </div>
                <RiskIcon
                  className={cn("h-4 w-4 shrink-0", riskTextColors[risk])}
                />
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Contract
                  </div>
                  <div className="text-xs font-medium text-foreground">
                    {formatCurrency(project.contractValue)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Complete
                  </div>
                  <div className="text-xs font-medium text-foreground">
                    {project.percentComplete}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Bid Margin
                  </div>
                  <div className="text-xs font-medium text-foreground">
                    {project.bidMargin}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Realized
                  </div>
                  <div
                    className={cn(
                      "text-xs font-medium",
                      riskTextColors[risk]
                    )}
                  >
                    {project.realizedMargin}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Pending COs
                  </div>
                  <div className="text-xs font-medium text-foreground">
                    {formatCurrency(project.pendingCOs)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Billing Lag
                  </div>
                  <div className="text-xs font-medium text-foreground">
                    {formatCurrency(project.billingLag)}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
