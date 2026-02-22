"use client"

import { useState, useRef, useCallback } from "react"
import { Send, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const SUGGESTED_PROMPTS = [
  {
    label: "Portfolio Health",
    text: "How's my portfolio doing?",
  },
  {
    label: "Worst Project",
    text: "Which project is bleeding the most margin?",
  },
  {
    label: "Unbilled Work",
    text: "Show me unbilled work across all projects",
  },
  {
    label: "Scope Creep",
    text: "Any scope creep signals in field notes?",
  },
  {
    label: "Pending COs",
    text: "What's our total change order exposure?",
  },
]

interface ChatInputProps {
  onSend: (text: string) => void
  isLoading: boolean
  showSuggestions: boolean
}

export function ChatInput({
  onSend,
  isLoading,
  showSuggestions,
}: ChatInputProps) {
  const [input, setInput] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault()
      if (!input.trim() || isLoading) return
      onSend(input.trim())
      setInput("")
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto"
      }
    },
    [input, isLoading, onSend]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value)
      // Auto-resize
      const el = e.target
      el.style.height = "auto"
      el.style.height = Math.min(el.scrollHeight, 160) + "px"
    },
    []
  )

  return (
    <div className="flex flex-col gap-3">
      {showSuggestions && (
        <div className="flex flex-wrap gap-2 justify-center">
          {SUGGESTED_PROMPTS.map((prompt) => (
            <button
              key={prompt.label}
              onClick={() => onSend(prompt.text)}
              disabled={isLoading}
              className={cn(
                "rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground",
                "hover:bg-secondary hover:text-foreground transition-colors",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {prompt.label}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="relative">
        <div className="flex items-end gap-2 rounded-xl border border-border bg-card p-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your portfolio..."
            disabled={isLoading}
            rows={1}
            className={cn(
              "flex-1 resize-none bg-transparent px-2 py-1.5 text-sm leading-relaxed",
              "placeholder:text-muted-foreground/50 focus:outline-none",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
              input.trim() && !isLoading
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-secondary text-muted-foreground"
            )}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
