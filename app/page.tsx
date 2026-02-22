"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";

export default function Home() {
  const { messages, sendMessage, status, error } = useChat({ api: "/api/chat" });
  const [draft, setDraft] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (draft.trim().length === 0) return;
    await sendMessage({ text: draft });
    setDraft("");
  };

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto p-4">
      <h1 className="text-xl font-semibold mb-1">HVAC Portfolio Assistant</h1>
      <p className="text-xs text-gray-400 mb-4">
        Status: {status} | Error: {String(error ?? "")}
      </p>

      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`p-3 rounded-lg text-sm whitespace-pre-wrap ${
              m.role === "user" ? "bg-blue-100 ml-8" : "bg-gray-100 mr-8"
            }`}
          >
            <span className="font-medium text-xs text-gray-500 block mb-1">
              {m.role === "user" ? "You" : "Assistant"}
            </span>
            {m.parts
              .filter((p) => p.type === "text")
              .map((p, i) => (
                <span key={i}>{p.text}</span>
              ))}
          </div>
        ))}
        {status === "streaming" && (
          <div className="bg-gray-100 mr-8 p-3 rounded-lg text-sm text-gray-400">
            Thinking...
          </div>
        )}
      </div>

      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask about your portfolio..."
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
        />
        <button
          type="submit"
          disabled={status !== "ready" || draft.trim().length === 0}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}
