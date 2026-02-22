"use client"

import { memo } from "react"
import type { UIMessage } from "ai"
import ReactMarkdown from "react-markdown"
import { ToolActivity } from "./tool-activity"
import { PortfolioCards } from "@/components/charts/portfolio-cards"
import { MarginChart } from "@/components/charts/margin-chart"
import { LaborChart } from "@/components/charts/labor-chart"
import { BillingChart } from "@/components/charts/billing-chart"
import { ForecastChart } from "@/components/charts/forecast-chart"
import { PatternsChart } from "@/components/charts/patterns-chart"
import { ChangeOrderChart } from "@/components/charts/change-order-chart"
import { SOVChart } from "@/components/charts/sov-chart"
import { FieldNotesChart } from "@/components/charts/field-notes-chart"
import { RFIChart } from "@/components/charts/rfi-chart"
import { MaterialChart } from "@/components/charts/material-chart"
import { cn } from "@/lib/utils"
import { Shield, User, ArrowRight, AlertTriangle, AlertCircle, Info } from "lucide-react"

interface ChatMessageProps {
  message: UIMessage
  onFollowUp?: (text: string) => void
}

// Extract follow-up suggestions from the end of the markdown
function extractFollowUps(text: string): { mainText: string; suggestions: string[] } {
  const followUpPattern = /###\s*What would you like to explore next\?\n([\s\S]*?)$/i
  const match = text.match(followUpPattern)
  if (!match) return { mainText: text, suggestions: [] }

  const mainText = text.slice(0, match.index).trimEnd()
  const suggestionsBlock = match[1]
  const suggestions: string[] = []

  // Parse lines like: - **Label**: "question text"  or  - **Label**: question text
  const linePattern = /^-\s+\*\*[^*]+\*\*:\s*"?([^"\n]+)"?/gm
  let lineMatch: RegExpExecArray | null
  while ((lineMatch = linePattern.exec(suggestionsBlock)) !== null) {
    suggestions.push(lineMatch[1].trim())
  }

  // Fallback: parse any bullet that starts with **
  if (suggestions.length === 0) {
    const fallbackPattern = /^-\s+\*\*[^*]+\*\*[:\s]+(.+)/gm
    let fallbackMatch: RegExpExecArray | null
    while ((fallbackMatch = fallbackPattern.exec(suggestionsBlock)) !== null) {
      suggestions.push(fallbackMatch[1].replace(/^["']|["']$/g, "").trim())
    }
  }

  return { mainText, suggestions }
}

// Extract confidence markers from text and render badges
const confidenceColors = {
  high: { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30", icon: Shield },
  medium: { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30", icon: AlertCircle },
  low: { bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/30", icon: AlertTriangle },
}

function ConfidenceBadge({ level }: { level: "high" | "medium" | "low" }) {
  const c = confidenceColors[level]
  const Icon = c.icon
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", c.bg, c.text, c.border)}>
      <Icon className="h-2.5 w-2.5" />
      {level} confidence
    </span>
  )
}

export const ChatMessage = memo(function ChatMessage({
  message,
  onFollowUp,
}: ChatMessageProps) {
  const isAssistant = message.role === "assistant"
  const isUser = message.role === "user"

  const textParts: string[] = []
  const toolParts: Array<{
    toolName: string
    state: string
    input: Record<string, unknown>
    output?: unknown
  }> = []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const part of message.parts as any[]) {
    if (part.type === "text") {
      if (part.text && String(part.text).trim()) {
        textParts.push(String(part.text))
      }
    } else if (part.type === "tool-invocation") {
      const inv = part.toolInvocation ?? part
      console.log("[v0] Tool part:", inv.toolName, "state:", inv.state, "has output:", !!inv.output, "has result:", !!inv.result, "keys:", Object.keys(inv))
      toolParts.push({
        toolName: String(inv.toolName ?? part.toolName ?? "unknown"),
        state: String(inv.state ?? part.state ?? ""),
        input: (inv.args ?? inv.input ?? part.input ?? {}) as Record<string, unknown>,
        output: (inv.state === "result" || inv.state === "output-available")
          ? (inv.result ?? inv.output ?? part.output)
          : undefined,
      })
    }
  }

  const fullText = textParts.join("\n")
  const { mainText, suggestions } = isAssistant ? extractFollowUps(fullText) : { mainText: fullText, suggestions: [] }

  // Detect confidence markers and render badges inline
  const processedText = mainText
    .replace(/\*\*High confidence\*\*/gi, "{{CONFIDENCE:high}}")
    .replace(/\*\*Medium confidence\*\*/gi, "{{CONFIDENCE:medium}}")
    .replace(/\*\*Low confidence\*\*/gi, "{{CONFIDENCE:low}}")

  return (
    <div
      className={cn(
        "flex gap-3 py-4",
        isUser && "justify-end"
      )}
    >
      {isAssistant && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Shield className="h-4 w-4" />
        </div>
      )}

      <div
        className={cn(
          "flex flex-col gap-1 max-w-[85%]",
          isUser && "items-end"
        )}
      >
        {/* Tool activity indicators */}
        {toolParts.length > 0 && (
          <div className="flex flex-col gap-0.5 w-full">
            {toolParts.map((tool, i) => (
              <ToolActivity
                key={`${tool.toolName}-${i}`}
                toolName={tool.toolName}
                state={tool.state}
                input={tool.input}
                output={tool.output}
              />
            ))}
          </div>
        )}

        {/* Inline charts for completed tool calls */}
        {toolParts.map((tool, i) => {
          if (!tool.output) return null
          const output = tool.output as Record<string, unknown>
          console.log("[v0] Chart render check:", tool.toolName, "keys:", Object.keys(output))

          if (tool.toolName === "portfolioScanner" && output.projects) {
            const projects = output.projects as unknown as Parameters<typeof PortfolioCards>[0]["projects"]
            const portfolio = output.portfolio as unknown as Parameters<typeof PortfolioCards>[0]["portfolio"]
            return (
              <div key={`chart-${i}`} className="w-full">
                <PortfolioCards portfolio={portfolio} projects={projects} />
                {projects.length > 1 && (
                  <MarginChart projects={projects as unknown as Parameters<typeof MarginChart>[0]["projects"]} />
                )}
              </div>
            )
          }

          if (tool.toolName === "laborAnalyzer" && output.sovLineBreakdown) {
            return (
              <div key={`chart-${i}`} className="w-full">
                <LaborChart
                  data={output.sovLineBreakdown as unknown as Parameters<typeof LaborChart>[0]["data"]}
                  projectId={output.projectId as string}
                />
              </div>
            )
          }

          if (tool.toolName === "billingAnalyzer" && output.projects) {
            return (
              <div key={`chart-${i}`} className="w-full">
                <BillingChart
                  projects={output.projects as unknown as Parameters<typeof BillingChart>[0]["projects"]}
                />
              </div>
            )
          }

          // Cross-project patterns
          if (tool.toolName === "crossProjectPatterns" && output.patterns) {
            return (
              <div key={`chart-${i}`} className="w-full">
                <PatternsChart
                  patterns={output.patterns as Parameters<typeof PatternsChart>[0]["patterns"]}
                  focusArea={output.focusArea as string}
                />
              </div>
            )
          }

          // Margin forecast chart
          if (tool.toolName === "marginForecast" && output.scenarios) {
            return (
              <div key={`chart-${i}`} className="w-full">
                <ForecastChart
                  projectName={output.projectName as string}
                  currentState={output.currentState as Parameters<typeof ForecastChart>[0]["currentState"]}
                  scenarios={output.scenarios as Parameters<typeof ForecastChart>[0]["scenarios"]}
                  recoveryPotential={output.recoveryPotential as Parameters<typeof ForecastChart>[0]["recoveryPotential"]}
                />
              </div>
            )
          }

          // Change order tracker
          if (tool.toolName === "changeOrderTracker" && output.approved) {
            return (
              <div key={`chart-${i}`} className="w-full">
                <ChangeOrderChart
                  approved={output.approved as { count: number; totalValue: number }}
                  pending={output.pending as { count: number; totalValue: number }}
                  denied={output.denied as { count: number; totalValue: number }}
                  byReasonCategory={output.byReasonCategory as Parameters<typeof ChangeOrderChart>[0]["byReasonCategory"]}
                  approvalRate={output.approvalRate as string}
                  projectId={output.projectId as string}
                />
              </div>
            )
          }

          // SOV drilldown
          if (tool.toolName === "sovDrilldown" && output.lines) {
            return (
              <div key={`chart-${i}`} className="w-full">
                <SOVChart
                  lines={output.lines as Parameters<typeof SOVChart>[0]["lines"]}
                  projectId={output.projectId as string}
                />
              </div>
            )
          }

          // Field notes scanner
          if (tool.toolName === "fieldNotesScanner" && output.totalMatches !== undefined) {
            return (
              <div key={`chart-${i}`} className="w-full">
                <FieldNotesChart
                  totalMatches={output.totalMatches as number}
                  totalNotes={output.totalNotesScanned as number}
                  matchRate={output.matchRate as string}
                  matches={(output.topMatches as Parameters<typeof FieldNotesChart>[0]["matches"]) ?? []}
                  keywords={(output.signalFrequency as Array<{ signal: string }>)?.map(s => s.signal) ?? []}
                />
              </div>
            )
          }

          // RFI tracker
          if (tool.toolName === "rfiTracker" && output.totalRFIs !== undefined) {
            return (
              <div key={`chart-${i}`} className="w-full">
                <RFIChart
                  totalRFIs={output.totalRFIs as number}
                  open={output.open as number}
                  closed={output.closed as number}
                  avgResponseDays={`${output.averageResponseDays}d`}
                  costImpacts={output.withCostImpact as number}
                  scheduleImpacts={output.withScheduleImpact as number}
                  topRFIs={(output.costImpactRFIs as Array<{
                    rfiNumber: string; subject: string; status: string;
                  }>)?.map(r => ({
                    ...r,
                    responseDays: 0,
                    costImpact: 0,
                    scheduleDays: 0,
                  })) ?? []}
                  projectId={output.projectId as string}
                />
              </div>
            )
          }

          // Material analyzer
          if (tool.toolName === "materialAnalyzer" && output.totalActualMaterial !== undefined) {
            return (
              <div key={`chart-${i}`} className="w-full">
                <MaterialChart
                  totalSpend={output.totalActualMaterial as number}
                  deliveryCount={output.deliveryCount as number}
                  issueCount={(output.conditionIssues as unknown[])?.length ?? 0}
                  topVendors={(output.byVendor as Array<{ vendor: string; totalCost: number }>)?.slice(0, 6).map(v => ({ ...v, deliveries: 0 })) ?? []}
                  topMaterials={(output.byCategory as Array<{ category: string; totalCost: number }>)?.map(c => ({ materialType: c.category, totalCost: c.totalCost, count: 0 })) ?? []}
                  projectId={output.projectId as string}
                />
              </div>
            )
          }

          // Proactive risk alert cards
          if (tool.toolName === "proactiveRiskAlert" && output.topAlerts) {
            const alerts = output.topAlerts as Array<{
              severity: string
              category: string
              projectName: string
              finding: string
              financialImpact: number
              recommendedAction: string
            }>
            return (
              <div key={`chart-${i}`} className="w-full my-2">
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-red-400">
                      Proactive Risk Alerts ({output.criticalCount as number} Critical, {output.warningCount as number} Warning)
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {alerts.slice(0, 5).map((alert, j) => (
                      <div key={j} className={cn(
                        "flex items-start gap-2 rounded-md px-2.5 py-1.5 text-xs",
                        alert.severity === "critical" ? "bg-red-500/10 text-red-300" : "bg-amber-500/10 text-amber-300"
                      )}>
                        <span className={cn(
                          "mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full",
                          alert.severity === "critical" ? "bg-red-500" : "bg-amber-500"
                        )} />
                        <div>
                          <span className="font-medium">{alert.projectName}</span>
                          <span className="text-muted-foreground"> - {alert.category}: </span>
                          <span>{alert.finding}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          }

          return null
        })}

        {/* Text content */}
        {processedText && (
          <div
            className={cn(
              "rounded-lg px-4 py-3",
              isUser
                ? "bg-primary text-primary-foreground"
                : "bg-card text-card-foreground border border-border"
            )}
          >
            {isAssistant ? (
              <div className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_h1]:text-base [&_h1]:font-semibold [&_h1]:text-foreground [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-foreground [&_h3]:text-sm [&_h3]:font-medium [&_h3]:text-foreground [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-card-foreground [&_li]:text-sm [&_li]:text-card-foreground [&_strong]:text-foreground [&_ul]:my-1 [&_ol]:my-1 [&_code]:text-xs [&_code]:bg-secondary [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_a]:text-primary [&_a]:no-underline hover:[&_a]:underline [&_blockquote]:border-border [&_hr]:border-border">
                <ReactMarkdown
                  components={{
                    p: ({ children }) => {
                      // Render confidence badges inline
                      if (typeof children === "string" && children.includes("{{CONFIDENCE:")) {
                        const parts = children.split(/({{CONFIDENCE:\w+}})/)
                        return (
                          <p>
                            {parts.map((part, idx) => {
                              const match = part.match(/{{CONFIDENCE:(\w+)}}/)
                              if (match) {
                                return <ConfidenceBadge key={idx} level={match[1] as "high" | "medium" | "low"} />
                              }
                              return <span key={idx}>{part}</span>
                            })}
                          </p>
                        )
                      }
                      return <p>{children}</p>
                    },
                  }}
                >
                  {processedText}
                </ReactMarkdown>
              </div>
            ) : (
              <p className="text-sm leading-relaxed">{processedText}</p>
            )}
          </div>
        )}

        {/* Clickable follow-up suggestions */}
        {suggestions.length > 0 && onFollowUp && (
          <div className="flex flex-col gap-1.5 mt-1 w-full">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 px-1">
              Explore further
            </span>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => onFollowUp(suggestion)}
                  className={cn(
                    "group flex items-center gap-1.5 rounded-lg border border-border bg-card/50 px-3 py-1.5 text-xs text-muted-foreground",
                    "hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all"
                  )}
                >
                  <span className="truncate max-w-[250px]">{suggestion}</span>
                  <ArrowRight className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  )
})
