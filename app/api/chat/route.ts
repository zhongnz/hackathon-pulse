import { streamText, convertToModelMessages, stepCountIs } from "ai"
import { agentTools } from "@/lib/agent/tools"
import { SYSTEM_PROMPT } from "@/lib/agent/system-prompt"

export const maxDuration = 120

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()
    console.log("[v0] POST /api/chat - received messages:", messages.length)

    const converted = await convertToModelMessages(messages)
    console.log("[v0] Converted messages:", converted.length)

    const result = streamText({
      model: "openai/gpt-4o",
      system: SYSTEM_PROMPT,
      messages: converted,
      tools: agentTools,
      toolChoice: "auto",
      stopWhen: stepCountIs(15),
      maxOutputTokens: 16000,
    })

    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error("[v0] API route error:", error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}
