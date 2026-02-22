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
} from "lucide-react"
import { cn } from "@/lib/utils"

const TOOL_META: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  portfolioScanner: {
    label: "Scanning Portfolio",
    icon: Search,
    color: "text-sky-400",
  },
  laborAnalyzer: {
    label: "Analyzing Labor Costs",
    icon: HardHat,
    color: "text-amber-400",
  },
  changeOrderTracker: {
    label: "Tracking Change Orders",
    icon: DollarSign,
    color: "text-emerald-400",
  },
  billingAnalyzer: {
    label: "Analyzing Billing",
    icon: BarChart3,
    color: "text-blue-400",
  },
  fieldNotesScanner: {
    label: "Scanning Field Notes",
    icon: FileText,
    color: "text-orange-400",
  },
  materialAnalyzer: {
    label: "Analyzing Materials",
    icon: Package,
    color: "text-violet-400",
  },
  sovDrilldown: {
    label: "SOV Drilldown",
    icon: ClipboardList,
    color: "text-cyan-400",
  },
  rfiTracker: {
    label: "Tracking RFIs",
    icon: ClipboardList,
    color: "text-rose-400",
  },
  sendEmailAlert: {
    label: "Sending Email",
    icon: Mail,
    color: "text-emerald-400",
  },
  marginForecast: {
    label: "Forecasting Margin",
    icon: TrendingUp,
    color: "text-sky-400",
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
    label: toolName,
    icon: Search,
    color: "text-muted-foreground",
  }
  const Icon = meta.icon
  const isRunning =
    state === "input-available" || state === "input-streaming"
  const isDone = state === "output-available"
  const isError = state === "output-error"

  const inputSummary = Object.entries(input || {})
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ")

  return (
    <div className="my-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
          "hover:bg-secondary/60",
          isRunning && "bg-secondary/40",
          isDone && "bg-secondary/20",
          isError && "bg-destructive/10"
        )}
      >
        {isRunning ? (
          <Loader2 className={cn("h-3.5 w-3.5 animate-spin", meta.color)} />
        ) : (
          <Icon className={cn("h-3.5 w-3.5", meta.color)} />
        )}
        <span className="text-muted-foreground">
          {isRunning ? meta.label : isDone ? meta.label : "Error"}
        </span>
        {inputSummary && (
          <span className="truncate text-muted-foreground/60 max-w-[200px]">
            ({inputSummary})
          </span>
        )}
        {isDone && (
          <span className="ml-auto text-emerald-500 text-[10px] font-semibold uppercase tracking-wider">
            Done
          </span>
        )}
        {isError && (
          <span className="ml-auto text-destructive text-[10px] font-semibold uppercase tracking-wider">
            Error
          </span>
        )}
        <span className="ml-1">
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
