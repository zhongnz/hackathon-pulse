import {
  getContracts,
  getSOV,
  getSOVBudget,
  getLaborLogs,
  getChangeOrders,
  getBillingHistory,
  getBillingLineItems,
  getMaterialDeliveries,
} from "./loader"
import type {
  ProjectSummary,
  SOVLineSummary,
  PortfolioSummary,
} from "./types"

// Cached summaries
let _projectSummaries: Map<string, ProjectSummary> | null = null
let _portfolioSummary: PortfolioSummary | null = null
let _sovLineSummaries: Map<string, SOVLineSummary[]> | null = null

function computeLaborCost(
  hoursSt: number,
  hoursOt: number,
  rate: number,
  burden: number
): number {
  return (hoursSt + hoursOt * 1.5) * rate * burden
}

export function getProjectSummaries(): Map<string, ProjectSummary> {
  if (_projectSummaries) return _projectSummaries

  const contracts = getContracts()
  const laborLogs = getLaborLogs()
  const changeOrders = getChangeOrders()
  const billingHistory = getBillingHistory()
  const billingLineItems = getBillingLineItems()
  const materialDeliveries = getMaterialDeliveries()
  const sovBudget = getSOVBudget()

  const summaries = new Map<string, ProjectSummary>()

  for (const contract of contracts) {
    const pid = contract.project_id

    // Labor costs
    const projectLabor = laborLogs.filter((l) => l.project_id === pid)
    const totalLaborCost = projectLabor.reduce(
      (sum, l) =>
        sum +
        computeLaborCost(
          l.hours_st,
          l.hours_ot,
          l.hourly_rate,
          l.burden_multiplier
        ),
      0
    )
    const totalLaborHours = projectLabor.reduce(
      (sum, l) => sum + l.hours_st + l.hours_ot,
      0
    )
    const totalOvertimeHours = projectLabor.reduce(
      (sum, l) => sum + l.hours_ot,
      0
    )

    // Material costs
    const projectMaterials = materialDeliveries.filter(
      (m) => m.project_id === pid
    )
    const totalMaterialCost = projectMaterials.reduce(
      (sum, m) => sum + m.total_cost,
      0
    )

    // Change orders
    const projectCOs = changeOrders.filter((co) => co.project_id === pid)
    const approvedCOValue = projectCOs
      .filter((co) => co.status === "Approved")
      .reduce((sum, co) => sum + co.amount, 0)
    const pendingCOValue = projectCOs
      .filter(
        (co) => co.status === "Pending" || co.status === "Under Review"
      )
      .reduce((sum, co) => sum + co.amount, 0)
    const deniedCOValue = projectCOs
      .filter((co) => co.status === "Denied" || co.status === "Rejected")
      .reduce((sum, co) => sum + co.amount, 0)

    // Billing
    const projectBilling = billingHistory
      .filter((b) => b.project_id === pid)
      .sort((a, b) => a.application_number - b.application_number)
    const latestBilling = projectBilling[projectBilling.length - 1]
    const amountBilled = latestBilling?.cumulative_billed ?? 0
    const retentionHeld = latestBilling?.retention_held ?? 0

    // Percent complete from billing line items (latest application)
    const latestAppNum = latestBilling?.application_number ?? 0
    const latestLineItems = billingLineItems.filter(
      (li) =>
        li.project_id === pid && li.application_number === latestAppNum
    )
    const totalScheduledValue = latestLineItems.reduce(
      (sum, li) => sum + li.scheduled_value,
      0
    )
    // Weighted average percent complete from billing line items
    const weightedPctComplete = latestLineItems.reduce(
      (sum, li) =>
        sum +
        (li.pct_complete / 100) * (totalScheduledValue > 0 ? li.scheduled_value / totalScheduledValue : 0),
      0
    )
    const percentComplete =
      totalScheduledValue > 0 ? weightedPctComplete : 0

    // Bid margin from SOV budget
    const projectBudget = sovBudget.filter((b) => b.project_id === pid)
    const totalEstimatedCost = projectBudget.reduce(
      (sum, b) =>
        sum +
        b.estimated_labor_cost +
        b.estimated_material_cost +
        b.estimated_equipment_cost +
        b.estimated_sub_cost,
      0
    )
    const bidMargin =
      contract.original_contract_value > 0
        ? (contract.original_contract_value - totalEstimatedCost) /
          contract.original_contract_value
        : 0

    // Equipment and subcontractor costs from budget (treated as actual since no separate tracking)
    const totalEquipmentCost = projectBudget.reduce(
      (sum, b) => sum + b.estimated_equipment_cost,
      0
    )
    const totalSubCost = projectBudget.reduce(
      (sum, b) => sum + b.estimated_sub_cost,
      0
    )
    // Scale equipment/sub costs by percent complete (they're budgeted amounts, prorate to progress)
    const proRatedEquipment = totalEquipmentCost * percentComplete
    const proRatedSub = totalSubCost * percentComplete

    // Computed metrics
    const totalActualCost = totalLaborCost + totalMaterialCost + proRatedEquipment + proRatedSub
    const adjustedContractValue =
      contract.original_contract_value + approvedCOValue
    const realizedMargin =
      adjustedContractValue > 0
        ? (adjustedContractValue - totalActualCost) / adjustedContractValue
        : 0
    const marginErosion = bidMargin - realizedMargin
    const earnedValue = percentComplete * adjustedContractValue
    const billingLag = earnedValue - amountBilled
    const overtimePercent =
      totalLaborHours > 0 ? totalOvertimeHours / totalLaborHours : 0

    // Risk rating
    let riskRating: "red" | "yellow" | "green" = "green"
    if (realizedMargin < 0.05 || marginErosion > 0.1) {
      riskRating = "red"
    } else if (realizedMargin < 0.1 || marginErosion > 0.05) {
      riskRating = "yellow"
    }

    summaries.set(pid, {
      projectId: pid,
      projectName: contract.project_name,
      contractValue: contract.original_contract_value,
      contractDate: contract.contract_date,
      completionDate: contract.substantial_completion_date,
      gcName: contract.gc_name,
      bidMargin,
      totalLaborCost,
      totalMaterialCost,
      totalActualCost,
      approvedCOValue,
      pendingCOValue,
      deniedCOValue,
      adjustedContractValue,
      realizedMargin,
      marginErosion,
      percentComplete,
      amountBilled,
      billingLag,
      retentionHeld,
      riskRating,
      totalLaborHours,
      totalOvertimeHours,
      overtimePercent,
    })
  }

  _projectSummaries = summaries
  return summaries
}

export function getPortfolioSummary(): PortfolioSummary {
  if (_portfolioSummary) return _portfolioSummary

  const projects = getProjectSummaries()
  let totalContractValue = 0
  let totalAdjustedValue = 0
  let totalActualCost = 0
  let totalApprovedCOs = 0
  let totalPendingCOs = 0
  let totalBillingLag = 0
  let totalRetention = 0
  let totalEstimatedCost = 0
  let redProjects = 0
  let yellowProjects = 0
  let greenProjects = 0

  const sovBudget = getSOVBudget()

  for (const [pid, project] of projects) {
    totalContractValue += project.contractValue
    totalAdjustedValue += project.adjustedContractValue
    totalActualCost += project.totalActualCost
    totalApprovedCOs += project.approvedCOValue
    totalPendingCOs += project.pendingCOValue
    totalBillingLag += project.billingLag
    totalRetention += project.retentionHeld

    const budgets = sovBudget.filter((b) => b.project_id === pid)
    totalEstimatedCost += budgets.reduce(
      (sum, b) =>
        sum +
        b.estimated_labor_cost +
        b.estimated_material_cost +
        b.estimated_equipment_cost +
        b.estimated_sub_cost,
      0
    )

    if (project.riskRating === "red") redProjects++
    else if (project.riskRating === "yellow") yellowProjects++
    else greenProjects++
  }

  const blendedBidMargin =
    totalContractValue > 0
      ? (totalContractValue - totalEstimatedCost) / totalContractValue
      : 0
  const blendedRealizedMargin =
    totalAdjustedValue > 0
      ? (totalAdjustedValue - totalActualCost) / totalAdjustedValue
      : 0

  _portfolioSummary = {
    totalContractValue,
    totalAdjustedValue,
    totalActualCost,
    totalApprovedCOs,
    totalPendingCOs,
    blendedBidMargin,
    blendedRealizedMargin,
    marginGap: blendedBidMargin - blendedRealizedMargin,
    totalBillingLag,
    totalRetention,
    projectCount: projects.size,
    redProjects,
    yellowProjects,
    greenProjects,
  }

  return _portfolioSummary
}

export function getSOVLineSummaries(projectId: string): SOVLineSummary[] {
  if (!_sovLineSummaries) _sovLineSummaries = new Map()
  if (_sovLineSummaries.has(projectId))
    return _sovLineSummaries.get(projectId)!

  const sovLines = getSOV().filter((s) => s.project_id === projectId)
  const budgets = getSOVBudget().filter((b) => b.project_id === projectId)
  const laborLogs = getLaborLogs().filter((l) => l.project_id === projectId)
  const materials = getMaterialDeliveries().filter(
    (m) => m.project_id === projectId
  )
  const billingLineItems = getBillingLineItems().filter(
    (li) => li.project_id === projectId
  )

  // Get latest application number
  const maxApp = billingLineItems.reduce(
    (max, li) => Math.max(max, li.application_number),
    0
  )

  const summaries: SOVLineSummary[] = sovLines.map((sov) => {
    const budget = budgets.find((b) => b.sov_line_id === sov.sov_line_id)
    const lineLabor = laborLogs.filter(
      (l) => l.sov_line_id === sov.sov_line_id
    )
    const lineMaterials = materials.filter(
      (m) => m.sov_line_id === sov.sov_line_id
    )
    const latestLineItem = billingLineItems.find(
      (li) =>
        li.sov_line_id === sov.sov_line_id &&
        li.application_number === maxApp
    )

    const actualLaborCost = lineLabor.reduce(
      (sum, l) =>
        sum +
        computeLaborCost(
          l.hours_st,
          l.hours_ot,
          l.hourly_rate,
          l.burden_multiplier
        ),
      0
    )
    const actualMaterialCost = lineMaterials.reduce(
      (sum, m) => sum + m.total_cost,
      0
    )
    const estimatedLaborCost = budget?.estimated_labor_cost ?? 0
    const estimatedMaterialCost = budget?.estimated_material_cost ?? 0

    return {
      sovLineId: sov.sov_line_id,
      description: sov.description,
      scheduledValue: sov.scheduled_value,
      estimatedLaborCost,
      actualLaborCost,
      estimatedMaterialCost,
      actualMaterialCost,
      laborVariance: actualLaborCost - estimatedLaborCost,
      materialVariance: actualMaterialCost - estimatedMaterialCost,
      totalVariance:
        actualLaborCost -
        estimatedLaborCost +
        (actualMaterialCost - estimatedMaterialCost),
      percentComplete: latestLineItem
        ? latestLineItem.pct_complete / 100
        : 0,
    }
  })

  _sovLineSummaries.set(projectId, summaries)
  return summaries
}
