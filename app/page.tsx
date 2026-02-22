"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";

export default function Home() {
  const { messages, sendMessage, status, error } = useChat({ api: "/api/chat" });
  const [draft, setDraft] = useState("");

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!draft.trim()) return;
    const text = draft;
    setDraft("");
    await sendMessage({ text });
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">HVAC Portfolio Assistant</h1>
      <div className="text-sm text-gray-500 mb-6">
        Status: {status} | Error: {String(error ?? "")}
      </div>

      <div className="mb-6 space-y-4">
        {messages.map((m) => (
          <div key={m.id}>
            <div className="text-sm text-gray-400">
              {m.role === "user" ? "You" : "Assistant"}
            </div>
            <div className="text-lg whitespace-pre-wrap">
              {m.parts
                .filter((p) => p.type === "text")
                .map((p, i) => (
                  <span key={i}>{(p as { type: "text"; text: string }).text}</span>
                ))}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask about your portfolio..."
          className="flex-1 border rounded px-3 py-2"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={status === "streaming" || !draft.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}
