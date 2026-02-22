"use client"

import { memo } from "react"
import type { UIMessage } from "ai"
import ReactMarkdown from "react-markdown"
import { ToolActivity } from "./tool-activity"
import { PortfolioCards } from "@/components/charts/portfolio-cards"
import { MarginChart } from "@/components/charts/margin-chart"
import { LaborChart } from "@/components/charts/labor-chart"
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

  for (const part of message.parts ?? []) {
    if (part.type === "text" && (part as { text: string }).text.trim()) {
      textParts.push((part as { text: string }).text)
    } else if (part.type.startsWith("tool-")) {
      const toolPart = part as unknown as {
        toolCallId: string
        toolName: string
        state: string
        input: unknown
        output?: unknown
      }
      toolParts.push({
        toolName: toolPart.toolName,
        state: toolPart.state,
        input: (toolPart.input ?? {}) as Record<string, unknown>,
        output:
          toolPart.state === "output-available"
            ? toolPart.output
            : undefined,
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
              <div className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-medium [&_p]:text-sm [&_p]:leading-relaxed [&_li]:text-sm [&_strong]:text-foreground [&_ul]:my-1 [&_ol]:my-1 [&_code]:text-xs [&_code]:bg-secondary [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded">
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
