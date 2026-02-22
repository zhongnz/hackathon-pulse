import { streamText, convertToModelMessages } from "ai";
import { groq } from "@ai-sdk/groq";
import { Resend } from "resend";

export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY);

const SYSTEM_PROMPT = `You are a CFO assistant for an HVAC construction company. Answer in plain conversational English. Never respond with JSON or XML. Use bullet points or short paragraphs.

Here is the current portfolio data:

PORTFOLIO RISK RANKING (by risk score):
1. PRJ-2024-003 — Greenfield Elementary School (Risk Score: 34, Gross Margin: 25.7%, Root Cause: Mixed — 14 labor overrun lines, 10 material overrun lines)
2. PRJ-2024-005 — Harbor View Condominiums (Risk Score: 33)
3. PRJ-2024-002 — Riverside Office Tower (Risk Score: 31)
4. PRJ-2024-004 — Summit Data Center (Risk Score: 27)
5. PRJ-2024-001 — Mercy General Hospital (Risk Score: 24)

HIGHEST RISK PROJECT — PRJ-2024-003 Greenfield Elementary School:
- Gross Margin: 25.7%
- Risk Score: 34 (highest in portfolio)
- 14 SOV lines with labor cost overrun > 50% of estimate
- 10 SOV lines with material cost overrun > 50% of estimate
- Root Cause: Mixed (both labor and material issues)
- Recommended actions:
  • Conduct full cost audit across overrun SOV lines
  • Identify whether labor and material overruns share the same work zones
  • Check for unsigned change orders covering both labor and materials
  • Prioritize recovery on lines with highest combined overrun dollar value

If the user asks you to send an email, confirm that the email was sent and summarize what you included in it.`;

function extractEmail(text: string): string | null {
  const match = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  return match ? match[0] : null;
}

function isEmailRequest(text: string): boolean {
  const lower = text.toLowerCase();
  return lower.includes("send") && lower.includes("email");
}

export async function POST(req: Request) {
  const body = await req.json();
  const { messages } = body;

  const lastMessage = messages[messages.length - 1];
  const lastText = lastMessage?.parts?.find((p: { type: string }) => p.type === "text")?.text ?? "";

  // Handle email requests directly without tool calling
  if (isEmailRequest(lastText)) {
    const to = extractEmail(lastText);
    if (to) {
      const emailBody = `HVAC Portfolio Risk Summary

Highest Risk Project: PRJ-2024-003 — Greenfield Elementary School
- Gross Margin: 25.7%
- Risk Score: 34 (highest in portfolio)
- Labor Overrun Lines: 14 (each >50% over estimate)
- Material Overrun Lines: 10 (each >50% over estimate)
- Root Cause: Mixed — both labor and material cost issues

Portfolio Risk Ranking:
1. Greenfield Elementary School — Risk Score 34
2. Harbor View Condominiums — Risk Score 33
3. Riverside Office Tower — Risk Score 31
4. Summit Data Center — Risk Score 27
5. Mercy General Hospital — Risk Score 24

Recommended Actions:
• Conduct full cost audit across overrun SOV lines
• Identify whether labor and material overruns share the same work zones
• Check for unsigned change orders covering both labor and materials
• Prioritize recovery on lines with highest combined overrun dollar value

— Sent by HVAC Portfolio Agent`;

      const sendTo = process.env.EMAIL_TO ?? to;
      console.log("Sending email to:", sendTo);
      const emailResult = await resend.emails.send({
        from: "HVAC Agent <onboarding@resend.dev>",
        to: sendTo,
        subject: "HVAC Portfolio Risk Summary — Action Required",
        text: emailBody,
      });
      console.log("Resend result:", JSON.stringify(emailResult));
    }
  }

  const modelMessages = await convertToModelMessages(messages);
  const result = streamText({
    model: groq("llama-3.3-70b-versatile"),
    system: SYSTEM_PROMPT,
    messages: modelMessages,
  });

  return result.toUIMessageStreamResponse();
}
