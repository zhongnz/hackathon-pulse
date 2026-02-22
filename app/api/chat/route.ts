import { streamText, convertToModelMessages, stepCountIs } from "ai"
import { agentTools } from "@/lib/agent/tools"
import { SYSTEM_PROMPT } from "@/lib/agent/system-prompt"

export const maxDuration = 120

export async function POST(req: Request) {
  const { messages } = await req.json()

  const result = streamText({
    model: "openai/gpt-5.3",
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools: agentTools,
    toolChoice: "auto",
    stopWhen: stepCountIs(15),
    maxOutputTokens: 16000,
  })

  return result.toUIMessageStreamResponse()
}
