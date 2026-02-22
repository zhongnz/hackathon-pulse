"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState } from "react";

const TOOL_LABELS: Record<string, string> = {
  scan_portfolio: "📊 Scanning full portfolio...",
  get_project_detail: "🔍 Drilling into project details...",
  analyze_change_orders: "📋 Analyzing change orders...",
  check_billing_lag: "💰 Checking billing history...",
  check_rfis: "📝 Reviewing open RFIs...",
  read_field_notes: "📄 Reading field notes...",
  send_email: "📧 Sending email report...",
};

export default function Home() {
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const [draft, setDraft] = useState("");

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!draft.trim()) return;
    const text = draft;
    setDraft("");
    await sendMessage({ text });
  };

  const isStreaming = status === "streaming";

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">HVAC Portfolio Agent</h1>
          <p className="text-gray-400 text-sm mt-1">
            Autonomous margin protection across your project portfolio
          </p>
          {isStreaming && (
            <div className="flex items-center gap-2 mt-2">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
              <span className="text-blue-400 text-xs">Agent is working...</span>
            </div>
          )}
          {error && (
            <p className="text-red-400 text-xs mt-1">Error: {String(error)}</p>
          )}
        </div>

        {/* Messages */}
        <div className="space-y-6 mb-6">
          {messages.length === 0 && (
            <div className="text-center py-16 text-gray-500">
              <p className="text-lg mb-2">Ask me about your portfolio</p>
              <p className="text-sm">Try: &ldquo;How&apos;s my portfolio doing?&rdquo; or &ldquo;Which project is most at risk?&rdquo;</p>
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id}>
              {m.role === "user" ? (
                /* User message */
                <div className="flex justify-end">
                  <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[80%] text-sm">
                    {m.parts
                      .filter((p) => p.type === "text")
                      .map((p, i) => (
                        <span key={i}>{(p as { type: "text"; text: string }).text}</span>
                      ))}
                  </div>
                </div>
              ) : (
                /* Assistant message */
                <div className="space-y-2">
                  {m.parts.map((part, i) => {
                    if (part.type.startsWith("tool-") && part.type !== "text") {
                      const toolPart = part as {
                        type: string;
                        toolCallId: string;
                        state: string;
                        input?: Record<string, unknown>;
                        output?: unknown;
                      };

                      const toolName = part.type.replace(/^tool-/, "");
                      const label = TOOL_LABELS[toolName] ?? `⚙️ ${toolName}...`;
                      const isDone = toolPart.state === "output";

                      return (
                        <div
                          key={i}
                          className={`flex items-start gap-2 px-3 py-2 rounded-lg text-xs border ${
                            isDone
                              ? "bg-gray-900 border-gray-800 text-gray-400"
                              : "bg-blue-950 border-blue-800 text-blue-300"
                          }`}
                        >
                          <span className={`mt-0.5 ${!isDone ? "animate-pulse" : ""}`}>
                            {isDone ? "✓" : "◌"}
                          </span>
                          <div>
                            <span className="font-medium">{label}</span>
                            {toolPart.input && Object.keys(toolPart.input).length > 0 && (
                              <span className="ml-2 text-gray-500">
                                {Object.entries(toolPart.input)
                                  .map(([k, v]) => `${k}: ${v}`)
                                  .join(", ")}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    }

                    if (part.type === "text") {
                      const text = (part as { type: "text"; text: string }).text;
                      if (!text.trim()) return null;
                      return (
                        <div key={i} className="text-gray-100 text-sm leading-relaxed whitespace-pre-wrap">
                          {text}
                        </div>
                      );
                    }

                    return null;
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="sticky bottom-0 bg-gray-950 pt-4 pb-2">
          <form onSubmit={onSubmit} className="flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask about your portfolio..."
              className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={isStreaming || !draft.trim()}
              className="px-5 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
