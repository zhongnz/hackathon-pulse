import { streamText, convertToModelMessages, tool, stepCountIs } from "ai";
import { groq } from "@ai-sdk/groq";
import { Resend } from "resend";
import { z } from "zod";
import {
  portfolioSummary,
  sovOverrunDetail,
  getChangeOrders,
  getRfis,
  getBillingHistory,
  getFieldNotes,
} from "@/lib/data";

export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY);

const SYSTEM_PROMPT = `You are an autonomous CFO agent for a $50M/year commercial HVAC construction company.

Your job is to REASON through the portfolio data, INVESTIGATE anomalies, and produce ACTIONABLE outputs — not just summarize what you see.

RULES:
- Always use tools to pull real data before answering. Never guess or make up numbers.
- When you find a problem, dig deeper with another tool call.
- Explain WHY problems exist, not just that they exist.
- Communicate in plain English. No JSON, no jargon.
- After investigating, give specific recovery actions with dollar estimates where possible.
- If asked to send an email, use the send_email tool and confirm what you sent.

AGENT BEHAVIOR:
- Chain tool calls until you have a complete picture.
- Start broad (scan_portfolio), then drill into the worst offenders.
- Always explain your reasoning between steps.`;

function extractEmail(text: string): string | null {
  const match = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  return match ? match[0] : null;
}

const tools = {
  scan_portfolio: tool({
    description:
      "Scan all projects in the portfolio. Returns margin health, labor/material overruns, and approved change orders for every project. Always start here for a portfolio-wide view.",
    inputSchema: z.object({}),
    execute: async () => {
      return portfolioSummary();
    },
  }),

  get_project_detail: tool({
    description:
      "Get SOV line-item overrun breakdown for a specific project. Shows which work areas are over budget on labor and/or materials. Use after scan_portfolio when a project needs deeper investigation.",
    inputSchema: z.object({
      project_id: z.string().describe("The project ID to investigate, e.g. PRJ-2024-003"),
    }),
    execute: async ({ project_id }) => {
      const detail = sovOverrunDetail(project_id);
      const overrunLines = detail.filter(
        (l) => l.labor_overrun_pct > 20 || l.material_overrun_pct > 20
      );
      return {
        project_id,
        total_sov_lines: detail.length,
        overrun_lines: overrunLines,
        clean_lines: detail.length - overrunLines.length,
      };
    },
  }),

  analyze_change_orders: tool({
    description:
      "Analyze change orders for a project. Shows approved, pending, and rejected COs with amounts. Use to understand revenue recovery opportunities.",
    inputSchema: z.object({
      project_id: z.string().describe("The project ID to analyze change orders for"),
    }),
    execute: async ({ project_id }) => {
      const cos = getChangeOrders().filter((c) => c.project_id === project_id);
      const approved = cos.filter((c) => c.status === "Approved");
      const pending = cos.filter((c) => c.status === "Pending");
      const rejected = cos.filter((c) => c.status === "Rejected");

      const totalApproved = approved.reduce((s, c) => s + (parseFloat(c.amount) || 0), 0);
      const totalPending = pending.reduce((s, c) => s + (parseFloat(c.amount) || 0), 0);
      const totalRejected = rejected.reduce((s, c) => s + (parseFloat(c.amount) || 0), 0);

      return {
        project_id,
        approved: { count: approved.length, total: Math.round(totalApproved) },
        pending: { count: pending.length, total: Math.round(totalPending), items: pending.map((c) => ({ co_number: c.co_number, description: c.description, amount: c.amount, reason: c.reason_category })) },
        rejected: { count: rejected.length, total: Math.round(totalRejected) },
        recovery_opportunity: Math.round(totalPending),
      };
    },
  }),

  check_billing_lag: tool({
    description:
      "Check billing history for a project to identify billing lags and cash flow risk.",
    inputSchema: z.object({
      project_id: z.string().describe("The project ID to check billing for"),
    }),
    execute: async ({ project_id }) => {
      const billing = getBillingHistory().filter((b) => b.project_id === project_id);
      const sorted = billing.sort(
        (a, b) => new Date(a.period_end).getTime() - new Date(b.period_end).getTime()
      );
      const totalBilled = sorted.reduce((s, b) => s + (parseFloat(b.period_total) || 0), 0);
      const retentionHeld = sorted.reduce((s, b) => s + (parseFloat(b.retention_held) || 0), 0);
      return {
        project_id,
        application_count: billing.length,
        total_billed: Math.round(totalBilled),
        retention_held: Math.round(retentionHeld),
        applications: sorted.map((b) => ({
          application: b.application_number,
          period_end: b.period_end,
          amount: b.period_total,
          status: b.status,
          payment_date: b.payment_date,
        })),
      };
    },
  }),

  check_rfis: tool({
    description:
      "Check open RFIs (Requests for Information) for a project. Open RFIs can carry hidden cost exposure and schedule risk.",
    inputSchema: z.object({
      project_id: z.string().describe("The project ID to check RFIs for"),
    }),
    execute: async ({ project_id }) => {
      const rfis = getRfis().filter((r) => r.project_id === project_id);
      const open = rfis.filter((r) => r.status !== "Closed");
      const withCostImpact = rfis.filter((r) => parseFloat(r.cost_impact ?? "0") > 0);
      return {
        project_id,
        total_rfis: rfis.length,
        open_rfis: open.length,
        rfis_with_cost_impact: withCostImpact.length,
        items: rfis.map((r) => ({
          rfi_number: r.rfi_number,
          subject: r.subject,
          status: r.status,
          cost_impact: r.cost_impact,
          days_open: r.days_open,
        })),
      };
    },
  }),

  read_field_notes: tool({
    description:
      "Read field notes for a project to find qualitative signals: verbal approvals, scope changes, crew issues, weather delays. Use to understand root causes behind the numbers.",
    inputSchema: z.object({
      project_id: z.string().describe("The project ID to read field notes for"),
      limit: z.number().optional().describe("Max number of notes to return (default 20)"),
    }),
    execute: async ({ project_id, limit = 20 }) => {
      const notes = getFieldNotes()
        .filter((n) => n.project_id === project_id)
        .slice(0, limit);
      return {
        project_id,
        note_count: notes.length,
        notes: notes.map((n) => ({
          date: n.date,
          author: n.author,
          note: n.note_text ?? n.note ?? n.content ?? Object.values(n).slice(-1)[0],
        })),
      };
    },
  }),

  send_email: tool({
    description:
      "Send an email report to the CFO. Use this when the user asks to send an email. Generate a professional subject and body based on your analysis findings.",
    inputSchema: z.object({
      to: z.string().describe("Recipient email address"),
      subject: z.string().describe("Email subject line"),
      body: z.string().describe("Full email body with findings and recommendations"),
    }),
    execute: async ({ to, subject, body }) => {
      const sendTo = process.env.EMAIL_TO ?? to;
      const fullBody = body + "\n\n— Sent by HVAC Portfolio Agent";
      const result = await resend.emails.send({
        from: "HVAC Agent <onboarding@resend.dev>",
        to: sendTo,
        subject,
        text: fullBody,
      });
      console.log("Email sent:", JSON.stringify(result));
      return {
        success: !result.error,
        sent_to: sendTo,
        subject,
        error: result.error ?? null,
      };
    },
  }),
};

export async function POST(req: Request) {
  const body = await req.json();
  const { messages } = body;

  const lastMessage = messages[messages.length - 1];
  const lastText =
    lastMessage?.parts?.find((p: { type: string }) => p.type === "text")?.text ?? "";

  const emailInMessage = extractEmail(lastText);
  const systemWithEmail = emailInMessage
    ? SYSTEM_PROMPT + `\n\nThe user mentioned this email address: ${emailInMessage}`
    : SYSTEM_PROMPT;

  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: groq("llama-3.3-70b-versatile"),
    system: systemWithEmail,
    messages: modelMessages,
    tools,
    stopWhen: stepCountIs(10),
    onStepFinish: ({ toolCalls, toolResults, text }) => {
      if (toolCalls && toolCalls.length > 0) {
        console.log(
          "[Agent Step]",
          toolCalls.map((tc) => `${tc.toolName}(${JSON.stringify(tc.input)})`).join(", ")
        );
      }
      if (text) {
        console.log("[Agent Text]", text.slice(0, 120));
      }
      if (toolResults && toolResults.length > 0) {
        console.log("[Tool Results done]", toolResults.map((r) => r.toolName).join(", "));
      }
    },
  });

  return result.toUIMessageStreamResponse();
}
