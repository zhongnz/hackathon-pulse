import { streamText, convertToModelMessages, stepCountIs } from "ai"
import { agentTools } from "@/lib/agent/tools"
import { SYSTEM_PROMPT } from "@/lib/agent/system-prompt"

export const maxDuration = 120

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()
    const converted = await convertToModelMessages(messages)

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
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}
