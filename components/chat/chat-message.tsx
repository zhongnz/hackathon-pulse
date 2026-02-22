"use client"

import { memo } from "react"
import type { UIMessage } from "ai"
import ReactMarkdown from "react-markdown"
import { ToolActivity } from "./tool-activity"
import { PortfolioCards } from "@/components/charts/portfolio-cards"
import { MarginChart } from "@/components/charts/margin-chart"
import { LaborChart } from "@/components/charts/labor-chart"
import { BillingChart } from "@/components/charts/billing-chart"
import { cn } from "@/lib/utils"
import { Shield, User } from "lucide-react"

interface ChatMessageProps {
  message: UIMessage
}

export const ChatMessage = memo(function ChatMessage({
  message,
}: ChatMessageProps) {
  const isAssistant = message.role === "assistant"
  const isUser = message.role === "user"

  // Collect tool invocations and text parts
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
      toolParts.push({
        toolName: String(part.toolName ?? "unknown"),
        state: String(part.state ?? ""),
        input: (part.input ?? {}) as Record<string, unknown>,
        output: part.state === "output-available" ? part.output : undefined,
      })
    }
  }

  const fullText = textParts.join("\n")

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
        {/* Tool activity indicators (before text) */}
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
          if (tool.state !== "output-available" || !tool.output) return null
          const output = tool.output as Record<string, unknown>

          if (tool.toolName === "portfolioScanner" && output.projects) {
            const projects = output.projects as unknown as Parameters<typeof PortfolioCards>[0]["projects"]
            const portfolio = output.portfolio as unknown as Parameters<typeof PortfolioCards>[0]["portfolio"]
            return (
              <div key={`chart-${i}`} className="w-full">
                <PortfolioCards
                  portfolio={portfolio}
                  projects={projects}
                />
                {projects.length > 1 && (
                  <MarginChart
                    projects={projects as unknown as Parameters<typeof MarginChart>[0]["projects"]}
                  />
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

          return null
        })}

        {/* Text content */}
        {fullText && (
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
                <ReactMarkdown>{fullText}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-sm leading-relaxed">{fullText}</p>
            )}
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
