import { tool } from "ai"
import { z } from "zod"
import {
  getProjectSummaries,
  getPortfolioSummary,
  getSOVLineSummaries,
} from "@/lib/data/aggregations"
import {
  getContracts,
  getLaborLogs,
  getChangeOrders,
  getBillingHistory,
  getBillingLineItems,
  getFieldNotes,
  getMaterialDeliveries,
  getRFIs,
  getSOVBudget,
} from "@/lib/data/loader"

// Tool 1: Portfolio Scanner
export const portfolioScanner = tool({
  description:
    "Scans the entire portfolio of 5 HVAC projects and returns a high-level health summary for each project including contract value, bid margin, realized margin, margin erosion, risk rating, pending CO exposure, and billing lag. Use this as the FIRST tool when the user asks about portfolio health or overall performance.",
  inputSchema: z.object({
    projectId: z
      .string()
      .optional()
      .describe(
        "Optional: filter to a specific project ID (e.g., PRJ-2024-001). If omitted, returns all projects."
      ),
  }),
  execute: async ({ projectId }) => {
    const summaries = getProjectSummaries()
    const portfolio = getPortfolioSummary()

    const projects = projectId
      ? [summaries.get(projectId)].filter(Boolean)
      : Array.from(summaries.values())

    return {
      portfolio: projectId
        ? undefined
        : {
            totalContractValue: portfolio.totalContractValue,
            totalAdjustedValue: portfolio.totalAdjustedValue,
            totalActualCost: portfolio.totalActualCost,
            blendedBidMargin: (portfolio.blendedBidMargin * 100).toFixed(1) + "%",
            blendedRealizedMargin:
              (portfolio.blendedRealizedMargin * 100).toFixed(1) + "%",
            marginGap: (portfolio.marginGap * 100).toFixed(1) + " pts",
            totalPendingCOs: portfolio.totalPendingCOs,
            totalBillingLag: portfolio.totalBillingLag,
            projectCount: portfolio.projectCount,
            redProjects: portfolio.redProjects,
            yellowProjects: portfolio.yellowProjects,
            greenProjects: portfolio.greenProjects,
          },
      projects: projects.map((p) => ({
        projectId: p!.projectId,
        projectName: p!.projectName,
        contractValue: p!.contractValue,
        adjustedContractValue: p!.adjustedContractValue,
        bidMargin: (p!.bidMargin * 100).toFixed(1) + "%",
        realizedMargin: (p!.realizedMargin * 100).toFixed(1) + "%",
        marginErosion: (p!.marginErosion * 100).toFixed(1) + " pts",
        totalActualCost: p!.totalActualCost,
        approvedCOs: p!.approvedCOValue,
        pendingCOs: p!.pendingCOValue,
        percentComplete: (p!.percentComplete * 100).toFixed(1) + "%",
        amountBilled: p!.amountBilled,
        billingLag: p!.billingLag,
        riskRating: p!.riskRating,
        overtimePercent: (p!.overtimePercent * 100).toFixed(1) + "%",
      })),
    }
  },
})

// Tool 2: Labor Cost Analyzer
export const laborAnalyzer = tool({
  description:
    "Analyzes labor costs for a specific project, comparing budgeted vs actual labor costs by SOV line. Shows overtime breakdown, cost by trade/role, and identifies the worst-performing SOV lines. Use this when investigating labor cost overruns.",
  inputSchema: z.object({
    projectId: z
      .string()
      .describe("The project ID to analyze (e.g., PRJ-2024-001)"),
    sovLineId: z
      .string()
      .optional()
      .describe("Optional: drill down to a specific SOV line"),
  }),
  execute: async ({ projectId, sovLineId }) => {
    const laborLogs = getLaborLogs().filter(
      (l) =>
        l.project_id === projectId &&
        (!sovLineId || l.sov_line_id === sovLineId)
    )
    const budgets = getSOVBudget().filter(
      (b) =>
        b.project_id === projectId &&
        (!sovLineId || b.sov_line_id === sovLineId)
    )

    // By SOV line
    const bySOVLine: Record<
      string,
      { actual: number; budget: number; hours: number; otHours: number }
    > = {}
    for (const log of laborLogs) {
      if (!bySOVLine[log.sov_line_id]) {
        bySOVLine[log.sov_line_id] = {
          actual: 0,
          budget: 0,
          hours: 0,
          otHours: 0,
        }
      }
      bySOVLine[log.sov_line_id].actual +=
        (log.hours_st + log.hours_ot * 1.5) *
        log.hourly_rate *
        log.burden_multiplier
      bySOVLine[log.sov_line_id].hours += log.hours_st + log.hours_ot
      bySOVLine[log.sov_line_id].otHours += log.hours_ot
    }
    for (const b of budgets) {
      if (bySOVLine[b.sov_line_id]) {
        bySOVLine[b.sov_line_id].budget = b.estimated_labor_cost
      }
    }

    // By role
    const byRole: Record<string, { cost: number; hours: number }> = {}
    for (const log of laborLogs) {
      if (!byRole[log.role]) byRole[log.role] = { cost: 0, hours: 0 }
      byRole[log.role].cost +=
        (log.hours_st + log.hours_ot * 1.5) *
        log.hourly_rate *
        log.burden_multiplier
      byRole[log.role].hours += log.hours_st + log.hours_ot
    }

    const totalActual = laborLogs.reduce(
      (sum, l) =>
        sum +
        (l.hours_st + l.hours_ot * 1.5) * l.hourly_rate * l.burden_multiplier,
      0
    )
    const totalBudget = budgets.reduce(
      (sum, b) => sum + b.estimated_labor_cost,
      0
    )
    const totalHours = laborLogs.reduce(
      (sum, l) => sum + l.hours_st + l.hours_ot,
      0
    )
    const totalOT = laborLogs.reduce((sum, l) => sum + l.hours_ot, 0)

    const sovLineDetails = Object.entries(bySOVLine)
      .map(([lineId, data]) => ({
        sovLineId: lineId,
        budgetedLaborCost: data.budget,
        actualLaborCost: Math.round(data.actual),
        variance: Math.round(data.actual - data.budget),
        variancePercent:
          data.budget > 0
            ? ((data.actual - data.budget) / data.budget * 100).toFixed(1) + "%"
            : "N/A",
        totalHours: data.hours,
        overtimeHours: data.otHours,
      }))
      .sort(
        (a, b) => b.variance - a.variance
      )

    return {
      projectId,
      totalBudgetedLabor: totalBudget,
      totalActualLabor: Math.round(totalActual),
      totalVariance: Math.round(totalActual - totalBudget),
      variancePercent:
        totalBudget > 0
          ? (((totalActual - totalBudget) / totalBudget) * 100).toFixed(1) + "%"
          : "N/A",
      totalHours,
      totalOvertimeHours: totalOT,
      overtimePercent:
        totalHours > 0
          ? ((totalOT / totalHours) * 100).toFixed(1) + "%"
          : "0%",
      sovLineBreakdown: sovLineDetails.slice(0, 15),
      costByRole: Object.entries(byRole)
        .map(([role, data]) => ({
          role,
          totalCost: Math.round(data.cost),
          totalHours: data.hours,
        }))
        .sort((a, b) => b.totalCost - a.totalCost),
    }
  },
})

// Tool 3: Change Order Tracker
export const changeOrderTracker = tool({
  description:
    "Tracks change orders across one or all projects. Shows approved, pending, denied COs with amounts, reasons, and approval rates. Calculates total CO exposure (pending COs that represent unrecovered cost). Use this to investigate unrecovered change order costs.",
  inputSchema: z.object({
    projectId: z
      .string()
      .optional()
      .describe(
        "Optional project ID. If omitted, shows portfolio-wide CO analysis."
      ),
  }),
  execute: async ({ projectId }) => {
    const allCOs = getChangeOrders()
    const cos = projectId
      ? allCOs.filter((co) => co.project_id === projectId)
      : allCOs

    const approved = cos.filter((co) => co.status === "Approved")
    const pending = cos.filter(
      (co) => co.status === "Pending" || co.status === "Under Review"
    )
    const denied = cos.filter(
      (co) => co.status === "Denied" || co.status === "Rejected"
    )

    // By reason category
    const byReason: Record<string, { count: number; totalAmount: number }> = {}
    for (const co of cos) {
      if (!byReason[co.reason_category])
        byReason[co.reason_category] = { count: 0, totalAmount: 0 }
      byReason[co.reason_category].count++
      byReason[co.reason_category].totalAmount += co.amount
    }

    return {
      projectId: projectId ?? "ALL",
      totalChangeOrders: cos.length,
      approved: {
        count: approved.length,
        totalValue: approved.reduce((s, co) => s + co.amount, 0),
      },
      pending: {
        count: pending.length,
        totalValue: pending.reduce((s, co) => s + co.amount, 0),
        items: pending.map((co) => ({
          coNumber: co.co_number,
          projectId: co.project_id,
          description: co.description,
          amount: co.amount,
          status: co.status,
          dateSubmitted: co.date_submitted,
          reason: co.reason_category,
          scheduleImpact: co.schedule_impact_days,
        })),
      },
      denied: {
        count: denied.length,
        totalValue: denied.reduce((s, co) => s + co.amount, 0),
      },
      approvalRate:
        cos.length > 0
          ? ((approved.length / cos.length) * 100).toFixed(1) + "%"
          : "N/A",
      byReasonCategory: Object.entries(byReason)
        .map(([reason, data]) => ({ reason, ...data }))
        .sort((a, b) => b.totalAmount - a.totalAmount),
      recentCOs: cos
        .sort(
          (a, b) =>
            new Date(b.date_submitted).getTime() -
            new Date(a.date_submitted).getTime()
        )
        .slice(0, 10)
        .map((co) => ({
          coNumber: co.co_number,
          projectId: co.project_id,
          description: co.description,
          amount: co.amount,
          status: co.status,
          dateSubmitted: co.date_submitted,
          reason: co.reason_category,
        })),
    }
  },
})

// Tool 4: Billing Lag Analyzer
export const billingAnalyzer = tool({
  description:
    "Analyzes billing lag (gap between work completed and amounts billed) for one or all projects. Shows % complete vs % billed, unbilled work in dollars, and cash flow impact. Use this to find cash flow problems and billing lag.",
  inputSchema: z.object({
    projectId: z
      .string()
      .optional()
      .describe(
        "Optional project ID. If omitted, shows portfolio-wide billing analysis."
      ),
  }),
  execute: async ({ projectId }) => {
    const summaries = getProjectSummaries()
    const billingHistory = getBillingHistory()
    const projects = projectId
      ? [summaries.get(projectId)].filter(Boolean)
      : Array.from(summaries.values())

    const projectBillingDetails = projects.map((p) => {
      const bills = billingHistory
        .filter((b) => b.project_id === p!.projectId)
        .sort((a, b) => a.application_number - b.application_number)

      return {
        projectId: p!.projectId,
        projectName: p!.projectName,
        contractValue: p!.adjustedContractValue,
        percentComplete: (p!.percentComplete * 100).toFixed(1) + "%",
        earnedValue: Math.round(
          p!.percentComplete * p!.adjustedContractValue
        ),
        amountBilled: p!.amountBilled,
        billingLag: Math.round(p!.billingLag),
        billingLagPercent:
          p!.adjustedContractValue > 0
            ? (
                (p!.billingLag / p!.adjustedContractValue) *
                100
              ).toFixed(1) + "%"
            : "0%",
        retentionHeld: p!.retentionHeld,
        billingTimeline: bills.map((b) => ({
          period: b.period_end,
          periodBilled: b.period_total,
          cumulativeBilled: b.cumulative_billed,
          status: b.status,
        })),
      }
    })

    const totalBillingLag = projectBillingDetails.reduce(
      (sum, p) => sum + p.billingLag,
      0
    )

    return {
      portfolioBillingLag: totalBillingLag,
      totalRetention: projects.reduce(
        (sum, p) => sum + p!.retentionHeld,
        0
      ),
      projects: projectBillingDetails.sort(
        (a, b) => b.billingLag - a.billingLag
      ),
    }
  },
})

// Tool 5: Field Notes Scanner
export const fieldNotesScanner = tool({
  description:
    "Scans unstructured field notes for risk signals like scope drift, verbal approvals, extra work, and other red flags. Searches ~1,300 field reports for keywords indicating margin risk. Use this to find hidden scope creep and undocumented changes.",
  inputSchema: z.object({
    projectId: z
      .string()
      .optional()
      .describe("Optional project ID to filter notes"),
    keywords: z
      .array(z.string())
      .optional()
      .describe(
        "Optional custom keywords to search for. If omitted, uses default risk signal keywords."
      ),
  }),
  execute: async ({ projectId, keywords }) => {
    const notes = getFieldNotes()
    const projectNotes = projectId
      ? notes.filter((n) => n.project_id === projectId)
      : notes

    const defaultKeywords = [
      "verbal approval",
      "extra work",
      "not in scope",
      "owner requested",
      "added",
      "change",
      "scope",
      "additional",
      "unforeseen",
      "rework",
      "delay",
      "waiting",
      "coordination issue",
      "conflict",
      "back charge",
      "backcharge",
      "overtime",
      "premium time",
      "expedite",
      "out of sequence",
      "not on drawings",
      "field decision",
      "directed by",
      "punch list",
      "deficiency",
      "rejected",
      "failed inspection",
    ]

    const searchTerms = keywords && keywords.length > 0 ? keywords : defaultKeywords

    const matches: Array<{
      projectId: string
      noteId: string
      date: string
      author: string
      noteType: string
      matchedKeywords: string[]
      excerpt: string
    }> = []

    for (const note of projectNotes) {
      const content = (note.content || "").toLowerCase()
      const matched = searchTerms.filter((kw) =>
        content.includes(kw.toLowerCase())
      )
      if (matched.length > 0) {
        matches.push({
          projectId: note.project_id,
          noteId: note.note_id,
          date: note.date,
          author: note.author,
          noteType: note.note_type,
          matchedKeywords: matched,
          excerpt:
            note.content.length > 300
              ? note.content.slice(0, 300) + "..."
              : note.content,
        })
      }
    }

    // Group by signal type
    const signalGroups: Record<string, number> = {}
    for (const m of matches) {
      for (const kw of m.matchedKeywords) {
        signalGroups[kw] = (signalGroups[kw] || 0) + 1
      }
    }

    return {
      totalNotesScanned: projectNotes.length,
      totalMatches: matches.length,
      matchRate:
        ((matches.length / projectNotes.length) * 100).toFixed(1) + "%",
      signalFrequency: Object.entries(signalGroups)
        .map(([signal, count]) => ({ signal, count }))
        .sort((a, b) => b.count - a.count),
      topMatches: matches
        .sort((a, b) => b.matchedKeywords.length - a.matchedKeywords.length)
        .slice(0, 20),
    }
  },
})

// Tool 6: Material Cost Analyzer
export const materialAnalyzer = tool({
  description:
    "Analyzes material delivery costs vs budget for a project. Shows cost variance by SOV line and material category, delivery conditions, and vendor spending.",
  inputSchema: z.object({
    projectId: z
      .string()
      .describe("The project ID to analyze"),
    sovLineId: z
      .string()
      .optional()
      .describe("Optional SOV line to drill into"),
  }),
  execute: async ({ projectId, sovLineId }) => {
    const deliveries = getMaterialDeliveries().filter(
      (m) =>
        m.project_id === projectId &&
        (!sovLineId || m.sov_line_id === sovLineId)
    )
    const budgets = getSOVBudget().filter(
      (b) =>
        b.project_id === projectId &&
        (!sovLineId || b.sov_line_id === sovLineId)
    )

    // By SOV line
    const byLine: Record<string, { actual: number; budget: number }> = {}
    for (const d of deliveries) {
      if (!byLine[d.sov_line_id])
        byLine[d.sov_line_id] = { actual: 0, budget: 0 }
      byLine[d.sov_line_id].actual += d.total_cost
    }
    for (const b of budgets) {
      if (!byLine[b.sov_line_id])
        byLine[b.sov_line_id] = { actual: 0, budget: 0 }
      byLine[b.sov_line_id].budget = b.estimated_material_cost
    }

    // By category
    const byCategory: Record<string, number> = {}
    for (const d of deliveries) {
      byCategory[d.material_category] =
        (byCategory[d.material_category] || 0) + d.total_cost
    }

    // By vendor
    const byVendor: Record<string, number> = {}
    for (const d of deliveries) {
      byVendor[d.vendor] = (byVendor[d.vendor] || 0) + d.total_cost
    }

    const totalActual = deliveries.reduce((s, d) => s + d.total_cost, 0)
    const totalBudget = budgets.reduce(
      (s, b) => s + b.estimated_material_cost,
      0
    )

    // Condition issues
    const issues = deliveries.filter(
      (d) =>
        d.condition_notes &&
        !d.condition_notes.toLowerCase().includes("good condition")
    )

    return {
      projectId,
      totalBudgetedMaterial: totalBudget,
      totalActualMaterial: Math.round(totalActual),
      totalVariance: Math.round(totalActual - totalBudget),
      deliveryCount: deliveries.length,
      bySOVLine: Object.entries(byLine)
        .map(([lineId, data]) => ({
          sovLineId: lineId,
          budget: data.budget,
          actual: Math.round(data.actual),
          variance: Math.round(data.actual - data.budget),
        }))
        .sort((a, b) => b.variance - a.variance),
      byCategory: Object.entries(byCategory)
        .map(([cat, cost]) => ({ category: cat, totalCost: Math.round(cost) }))
        .sort((a, b) => b.totalCost - a.totalCost),
      byVendor: Object.entries(byVendor)
        .map(([vendor, cost]) => ({
          vendor,
          totalCost: Math.round(cost),
        }))
        .sort((a, b) => b.totalCost - a.totalCost),
      conditionIssues: issues.slice(0, 10).map((d) => ({
        deliveryId: d.delivery_id,
        date: d.date,
        item: d.item_description,
        notes: d.condition_notes,
      })),
    }
  },
})

// Tool 7: SOV Drilldown
export const sovDrilldown = tool({
  description:
    "Provides a detailed line-by-line breakdown of a project's Schedule of Values, comparing budget vs actual for labor and materials. Highlights the worst-performing lines. Use this for deep-dive project analysis.",
  inputSchema: z.object({
    projectId: z.string().describe("The project ID to drill into"),
  }),
  execute: async ({ projectId }) => {
    const lineSummaries = getSOVLineSummaries(projectId)
    const contract = getContracts().find((c) => c.project_id === projectId)

    return {
      projectId,
      projectName: contract?.project_name ?? projectId,
      contractValue: contract?.original_contract_value ?? 0,
      lineCount: lineSummaries.length,
      lines: lineSummaries
        .map((line) => ({
          sovLineId: line.sovLineId,
          description: line.description,
          scheduledValue: line.scheduledValue,
          estimatedLabor: line.estimatedLaborCost,
          actualLabor: Math.round(line.actualLaborCost),
          laborVariance: Math.round(line.laborVariance),
          estimatedMaterial: line.estimatedMaterialCost,
          actualMaterial: Math.round(line.actualMaterialCost),
          materialVariance: Math.round(line.materialVariance),
          totalVariance: Math.round(line.totalVariance),
          percentComplete: (line.percentComplete * 100).toFixed(1) + "%",
        }))
        .sort(
          (a, b) => b.totalVariance - a.totalVariance
        ),
    }
  },
})

// Tool 8: RFI Tracker
export const rfiTracker = tool({
  description:
    "Tracks Requests for Information (RFIs) for one or all projects. Shows open/closed status, response times, cost impacts, and links to change orders. Use this to understand design issues contributing to cost growth.",
  inputSchema: z.object({
    projectId: z
      .string()
      .optional()
      .describe("Optional project ID filter"),
  }),
  execute: async ({ projectId }) => {
    const allRFIs = getRFIs()
    const rfis = projectId
      ? allRFIs.filter((r) => r.project_id === projectId)
      : allRFIs

    const open = rfis.filter(
      (r) => r.status === "Open" || r.status === "Pending"
    )
    const closed = rfis.filter((r) => r.status === "Closed")
    const withCostImpact = rfis.filter(
      (r) => r.cost_impact === "True" || r.cost_impact === true
    )
    const withScheduleImpact = rfis.filter(
      (r) => r.schedule_impact === "True" || r.schedule_impact === true
    )

    // Average response time for closed RFIs
    const responseTimes = closed
      .filter((r) => r.date_submitted && r.date_responded)
      .map((r) => {
        const submitted = new Date(r.date_submitted).getTime()
        const responded = new Date(r.date_responded).getTime()
        return (responded - submitted) / (1000 * 60 * 60 * 24)
      })
    const avgResponseDays =
      responseTimes.length > 0
        ? responseTimes.reduce((s, d) => s + d, 0) / responseTimes.length
        : 0

    // By priority
    const byPriority: Record<string, number> = {}
    for (const r of rfis) {
      byPriority[r.priority] = (byPriority[r.priority] || 0) + 1
    }

    return {
      projectId: projectId ?? "ALL",
      totalRFIs: rfis.length,
      open: open.length,
      closed: closed.length,
      withCostImpact: withCostImpact.length,
      withScheduleImpact: withScheduleImpact.length,
      averageResponseDays: Math.round(avgResponseDays),
      byPriority,
      openRFIs: open.slice(0, 10).map((r) => ({
        rfiNumber: r.rfi_number,
        projectId: r.project_id,
        subject: r.subject,
        priority: r.priority,
        dateSubmitted: r.date_submitted,
        assignedTo: r.assigned_to,
      })),
      costImpactRFIs: withCostImpact.slice(0, 10).map((r) => ({
        rfiNumber: r.rfi_number,
        projectId: r.project_id,
        subject: r.subject,
        status: r.status,
        responseSummary: r.response_summary,
      })),
    }
  },
})

// Tool 9: Send Email Alert
export const sendEmailAlert = tool({
  description:
    "Sends an email alert or report via Resend. Use this when the user asks to email findings, send alerts about critical margin issues, or distribute a portfolio summary. Compose a professional email with the analysis results.",
  inputSchema: z.object({
    to: z.string().describe("Recipient email address"),
    subject: z.string().describe("Email subject line"),
    body: z
      .string()
      .describe(
        "Email body content in HTML format. Include specific numbers, findings, and action items."
      ),
  }),
  execute: async ({ to, subject, body }) => {
    // Dynamic import to avoid issues if resend is not configured
    try {
      const { Resend } = await import("resend")
      const resend = new Resend(process.env.RESEND_API_KEY)

      const result = await resend.emails.send({
        from: "Margin Guard <onboarding@resend.dev>",
        to: [to],
        subject,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #0f172a; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 20px;">Margin Guard Alert</h1>
              <p style="margin: 5px 0 0; opacity: 0.7; font-size: 14px;">HVAC Portfolio Intelligence</p>
            </div>
            <div style="border: 1px solid #e2e8f0; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
              ${body}
            </div>
            <p style="color: #94a3b8; font-size: 12px; margin-top: 16px;">
              This alert was generated by Margin Guard AI. Review all findings before taking action.
            </p>
          </div>
        `,
      })

      return {
        success: true,
        messageId: result.data?.id ?? "sent",
        to,
        subject,
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown error"
      return {
        success: false,
        error: `Failed to send email: ${message}. Make sure RESEND_API_KEY is configured.`,
        to,
        subject,
      }
    }
  },
})

// Tool 10: Margin Forecast
export const marginForecast = tool({
  description:
    "Projects the final margin for a project based on current burn rates. Calculates estimated cost-to-complete, best/worst/expected scenarios, and recovery potential if pending COs are approved. Use this for forward-looking analysis.",
  inputSchema: z.object({
    projectId: z.string().describe("The project ID to forecast"),
  }),
  execute: async ({ projectId }) => {
    const summary = getProjectSummaries().get(projectId)
    if (!summary) return { error: `Project ${projectId} not found` }

    const budgets = getSOVBudget().filter((b) => b.project_id === projectId)
    const totalEstimatedCost = budgets.reduce(
      (sum, b) =>
        sum +
        b.estimated_labor_cost +
        b.estimated_material_cost +
        b.estimated_equipment_cost +
        b.estimated_sub_cost,
      0
    )

    const pctComplete = summary.percentComplete || 0.01 // avoid division by 0
    const currentBurnRate =
      pctComplete > 0 ? summary.totalActualCost / pctComplete : 0
    const projectedTotalCost = currentBurnRate // at current burn rate
    const remainingWork = 1 - pctComplete
    const costToComplete = projectedTotalCost - summary.totalActualCost

    // Scenarios
    const bestCase = {
      scenario: "Best Case (pending COs approved, burn rate improves 10%)",
      projectedCost: Math.round(
        summary.totalActualCost + costToComplete * 0.9
      ),
      adjustedContract:
        summary.adjustedContractValue + summary.pendingCOValue,
      projectedMargin: 0,
    }
    bestCase.projectedMargin =
      bestCase.adjustedContract > 0
        ? (bestCase.adjustedContract - bestCase.projectedCost) /
          bestCase.adjustedContract
        : 0

    const expectedCase = {
      scenario: "Expected Case (current trajectory, 50% pending COs approved)",
      projectedCost: Math.round(projectedTotalCost),
      adjustedContract:
        summary.adjustedContractValue + summary.pendingCOValue * 0.5,
      projectedMargin: 0,
    }
    expectedCase.projectedMargin =
      expectedCase.adjustedContract > 0
        ? (expectedCase.adjustedContract - expectedCase.projectedCost) /
          expectedCase.adjustedContract
        : 0

    const worstCase = {
      scenario: "Worst Case (no pending COs, burn rate increases 10%)",
      projectedCost: Math.round(
        summary.totalActualCost + costToComplete * 1.1
      ),
      adjustedContract: summary.adjustedContractValue,
      projectedMargin: 0,
    }
    worstCase.projectedMargin =
      worstCase.adjustedContract > 0
        ? (worstCase.adjustedContract - worstCase.projectedCost) /
          worstCase.adjustedContract
        : 0

    const recoveryPotential = summary.pendingCOValue + Math.max(0, summary.billingLag)

    return {
      projectId,
      projectName: summary.projectName,
      currentState: {
        contractValue: summary.contractValue,
        adjustedContractValue: summary.adjustedContractValue,
        percentComplete: (pctComplete * 100).toFixed(1) + "%",
        totalCostToDate: Math.round(summary.totalActualCost),
        currentBidMargin: (summary.bidMargin * 100).toFixed(1) + "%",
        currentRealizedMargin:
          (summary.realizedMargin * 100).toFixed(1) + "%",
      },
      projections: {
        estimatedCostAtCompletion: Math.round(projectedTotalCost),
        originalBudget: totalEstimatedCost,
        costToComplete: Math.round(costToComplete),
        burnRateVsBudget:
          totalEstimatedCost > 0
            ? (
                ((projectedTotalCost - totalEstimatedCost) /
                  totalEstimatedCost) *
                100
              ).toFixed(1) + "% over budget"
            : "N/A",
      },
      scenarios: [
        {
          ...bestCase,
          projectedMargin:
            (bestCase.projectedMargin * 100).toFixed(1) + "%",
        },
        {
          ...expectedCase,
          projectedMargin:
            (expectedCase.projectedMargin * 100).toFixed(1) + "%",
        },
        {
          ...worstCase,
          projectedMargin:
            (worstCase.projectedMargin * 100).toFixed(1) + "%",
        },
      ],
      recoveryPotential: {
        pendingCOs: summary.pendingCOValue,
        billingLagRecovery: Math.max(0, summary.billingLag),
        total: Math.round(recoveryPotential),
        marginImpactIfRecovered:
          summary.adjustedContractValue > 0
            ? (
                (recoveryPotential / summary.adjustedContractValue) *
                100
              ).toFixed(1) + " pts"
            : "N/A",
      },
    }
  },
})

// Export all tools as a single object
export const agentTools = {
  portfolioScanner,
  laborAnalyzer,
  changeOrderTracker,
  billingAnalyzer,
  fieldNotesScanner,
  materialAnalyzer,
  sovDrilldown,
  rfiTracker,
  sendEmailAlert,
  marginForecast,
}
