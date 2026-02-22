"use client"

import { useRef, useEffect, useCallback } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { ChatMessage } from "@/components/chat/chat-message"
import { ChatInput } from "@/components/chat/chat-input"
import { Shield, Activity } from "lucide-react"

const transport = new DefaultChatTransport({ api: "/api/chat" })

export default function Home() {
  const { messages, sendMessage, status } = useChat({
    id: "margin-guard",
    transport,
  })
  const scrollRef = useRef<HTMLDivElement>(null)
  const isLoading = status === "streaming" || status === "submitted"
  const hasMessages = messages.length > 0

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = useCallback(
    (text: string) => {
      sendMessage({ text })
    },
    [sendMessage]
  )

  return (
    <div className="flex h-dvh flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-4 py-3 lg:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground">
              Margin Guard
            </h1>
            <p className="text-xs text-muted-foreground">
              HVAC Portfolio Intelligence
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isLoading && (
            <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1">
              <Activity className="h-3 w-3 text-primary animate-pulse" />
              <span className="text-xs font-medium text-primary">
                Analyzing
              </span>
            </div>
          )}
          <div className="hidden md:flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1">
            <span className="text-xs text-muted-foreground">
              5 Projects
            </span>
            <span className="text-xs text-muted-foreground/50">|</span>
            <span className="text-xs text-muted-foreground">
              ~$101M Portfolio
            </span>
          </div>
        </div>
      </header>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 lg:px-6">
          {!hasMessages && (
            <div className="flex flex-col items-center justify-center py-16 gap-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <div className="text-center max-w-lg">
                <h2 className="text-xl font-semibold text-foreground text-balance">
                  Margin Guard
                </h2>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed text-pretty">
                  Your AI-powered margin protection agent. I autonomously
                  scan your $101M HVAC portfolio, investigate root causes
                  of margin erosion, and deliver prioritized recovery actions.
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-xl">
                {[
                  { label: "Projects", value: "5 Active" },
                  { label: "Portfolio", value: "$101M" },
                  { label: "Records", value: "18K+" },
                  { label: "Tools", value: "10 Agents" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-lg border border-border bg-card/50 px-3 py-2 text-center"
                  >
                    <div className="text-xs text-muted-foreground">
                      {stat.label}
                    </div>
                    <div className="text-sm font-semibold text-foreground">
                      {stat.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}

          {/* Streaming indicator */}
          {isLoading &&
            messages.length > 0 &&
            (() => {
              const lastMsg = messages[messages.length - 1]
              const parts = lastMsg.parts ?? []
              const hasContent = parts.some(
                (p) =>
                  (p.type === "text" &&
                    (p as { text: string }).text.trim()) ||
                  p.type.startsWith("tool-")
              )
              return !hasContent
            })() && (
              <div className="flex gap-3 py-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Shield className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-1.5 rounded-lg bg-card border border-border px-4 py-3">
                  <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-pulse" />
                  <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-pulse [animation-delay:0.2s]" />
                  <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-pulse [animation-delay:0.4s]" />
                </div>
              </div>
            )}

          {/* Bottom spacer */}
          <div className="h-4" />
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-border bg-background px-4 py-3 lg:px-6">
        <div className="mx-auto max-w-3xl">
          <ChatInput
            onSend={handleSend}
            isLoading={isLoading}
            showSuggestions={!hasMessages}
          />
        </div>
      </div>
    </div>
  )
}
