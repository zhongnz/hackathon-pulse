"use client"

import { useState } from "react"
import {
  ChevronDown,
  ChevronRight,
  Search,
  DollarSign,
  FileText,
  BarChart3,
  Mail,
  TrendingUp,
  ClipboardList,
  Package,
  HardHat,
  Loader2,
  AlertTriangle,
  Layers,
} from "lucide-react"
import { cn } from "@/lib/utils"

const TOOL_META: Record<
  string,
  { active: string; done: string; icon: React.ElementType; color: string; description: string }
> = {
  portfolioScanner: {
    active: "Scanning Portfolio",
    done: "Scanned Portfolio",
    icon: Search,
    color: "text-sky-400",
    description: "Analyzing 5 projects, $101M contract value, margin health & risk ratings",
  },
  laborAnalyzer: {
    active: "Analyzing Labor Costs",
    done: "Analyzed Labor Costs",
    icon: HardHat,
    color: "text-amber-400",
    description: "Comparing budgeted vs actual labor by SOV line, overtime breakdown",
  },
  changeOrderTracker: {
    active: "Tracking Change Orders",
    done: "Tracked Change Orders",
    icon: DollarSign,
    color: "text-emerald-400",
    description: "Reviewing approved, pending & denied COs, calculating exposure",
  },
  billingAnalyzer: {
    active: "Analyzing Billing",
    done: "Analyzed Billing",
    icon: BarChart3,
    color: "text-blue-400",
    description: "Calculating billing lag, earned value vs billed, cash flow gaps",
  },
  fieldNotesScanner: {
    active: "Scanning Field Notes",
    done: "Scanned Field Notes",
    icon: FileText,
    color: "text-orange-400",
    description: "Searching ~1,300 field reports for scope creep & risk signals",
  },
  materialAnalyzer: {
    active: "Analyzing Materials",
    done: "Analyzed Materials",
    icon: Package,
    color: "text-violet-400",
    description: "Checking material costs vs budget, vendor spending, delivery conditions",
  },
  sovDrilldown: {
    active: "Drilling into SOV",
    done: "Completed SOV Drilldown",
    icon: ClipboardList,
    color: "text-cyan-400",
    description: "Line-by-line Schedule of Values analysis, budget vs actual",
  },
  rfiTracker: {
    active: "Tracking RFIs",
    done: "Tracked RFIs",
    icon: ClipboardList,
    color: "text-rose-400",
    description: "Reviewing open RFIs, response times, cost & schedule impacts",
  },
  sendEmailAlert: {
    active: "Sending Email",
    done: "Sent Email",
    icon: Mail,
    color: "text-emerald-400",
    description: "Composing and sending professional margin alert report",
  },
  marginForecast: {
    active: "Forecasting Margin",
    done: "Forecasted Margin",
    icon: TrendingUp,
    color: "text-sky-400",
    description: "Projecting best/expected/worst case scenarios with recovery potential",
  },
  crossProjectPatterns: {
    active: "Detecting Cross-Project Patterns",
    done: "Detected Cross-Project Patterns",
    icon: Layers,
    color: "text-indigo-400",
    description: "Finding systemic issues appearing across multiple projects",
  },
  proactiveRiskAlert: {
    active: "Running Proactive Risk Scan",
    done: "Completed Risk Scan",
    icon: AlertTriangle,
    color: "text-red-400",
    description: "Autonomously identifying top financial risks ranked by impact",
  },
}

interface ToolActivityProps {
  toolName: string
  state: string
  input: Record<string, unknown>
  output?: unknown
}

export function ToolActivity({
  toolName,
  state,
  input,
  output,
}: ToolActivityProps) {
  const [expanded, setExpanded] = useState(false)
  const meta = TOOL_META[toolName] ?? {
    active: toolName,
    done: toolName,
    icon: Search,
    color: "text-muted-foreground",
    description: "",
  }
  const Icon = meta.icon
  const isRunning =
    state === "input-available" || state === "input-streaming"
  const isDone = state === "output-available"
  const isError = state === "output-error"

  // Build a human-readable summary of what was analyzed
  const inputSummary = Object.entries(input || {})
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => {
      if (k === "projectId" && typeof v === "string") return v.replace("PRJ-2024-00", "Project ")
      if (k === "focusArea") return String(v)
      return `${k}: ${v}`
    })
    .join(", ")

  // Extract a quick summary from the output
  function getOutputSummary(): string | null {
    if (!output || typeof output !== "object") return null
    const o = output as Record<string, unknown>
    const parts: string[] = []
    if (o.totalMatches !== undefined) parts.push(`${o.totalMatches} risk signals found`)
    if (o.totalAlerts !== undefined) parts.push(`${o.totalAlerts} alerts (${o.criticalCount} critical)`)
    if (o.totalVariance !== undefined) parts.push(`$${((o.totalVariance as number) / 1000).toFixed(0)}K variance`)
    if (o.portfolioBillingLag !== undefined) parts.push(`$${((o.portfolioBillingLag as number) / 1000).toFixed(0)}K billing lag`)
    if (o.totalChangeOrders !== undefined) parts.push(`${o.totalChangeOrders} change orders`)
    if (o.totalRFIs !== undefined) parts.push(`${o.totalRFIs} RFIs (${o.open} open)`)
    if (o.lineCount !== undefined) parts.push(`${o.lineCount} SOV lines analyzed`)
    if (o.success !== undefined) parts.push(o.success ? "Sent successfully" : "Failed to send")
    return parts.length > 0 ? parts.join(" | ") : null
  }

  const outputSummary = isDone ? getOutputSummary() : null

  return (
    <div className="my-0.5">
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition-colors",
          "hover:bg-secondary/60",
          isRunning && "bg-secondary/40 border border-primary/20",
          isDone && "bg-secondary/20",
          isError && "bg-destructive/10"
        )}
      >
        {isRunning ? (
          <Loader2 className={cn("h-3.5 w-3.5 animate-spin shrink-0", meta.color)} />
        ) : (
          <Icon className={cn("h-3.5 w-3.5 shrink-0", meta.color)} />
        )}
        <div className="flex flex-col items-start gap-0.5 flex-1 min-w-0">
          <div className="flex items-center gap-2 w-full">
            <span className="text-muted-foreground font-medium">
              {isRunning ? meta.active : isDone ? meta.done : "Error"}
            </span>
            {inputSummary && (
              <span className="truncate text-muted-foreground/50 text-[10px] max-w-[180px]">
                {inputSummary}
              </span>
            )}
          </div>
          {isRunning && meta.description && (
            <span className="text-[10px] text-muted-foreground/50 leading-tight">
              {meta.description}
            </span>
          )}
          {isDone && outputSummary && (
            <span className="text-[10px] text-emerald-400/70 leading-tight">
              {outputSummary}
            </span>
          )}
        </div>
        {isDone && (
          <span className="shrink-0 ml-auto text-emerald-500 text-[10px] font-semibold uppercase tracking-wider">
            Done
          </span>
        )}
        {isError && (
          <span className="shrink-0 ml-auto text-destructive text-[10px] font-semibold uppercase tracking-wider">
            Error
          </span>
        )}
        <span className="shrink-0 ml-1">
          {expanded ? (
            <ChevronDown className="h-3 w-3 text-muted-foreground/50" />
          ) : (
            <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
          )}
        </span>
      </button>

      {expanded && output && (
        <div className="ml-6 mt-1 rounded-md bg-secondary/30 p-2 text-xs font-mono text-muted-foreground max-h-[300px] overflow-auto">
          <pre className="whitespace-pre-wrap break-words">
            {JSON.stringify(output, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
