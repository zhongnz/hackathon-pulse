import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "hvac_construction_dataset");

function parseCsv(filename: string): Record<string, string>[] {
  const raw = fs.readFileSync(path.join(DATA_DIR, filename), "utf-8");
  const lines = raw.trim().split("\n");
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = (values[i] ?? "").trim();
    });
    return row;
  });
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

export function getContracts() {
  return parseCsv("contracts.csv");
}

export function getSov() {
  return parseCsv("sov.csv");
}

export function getSovBudget() {
  return parseCsv("sov_budget.csv");
}

export function getLaborLogs() {
  return parseCsv("labor_logs.csv");
}

export function getMaterialDeliveries() {
  return parseCsv("material_deliveries.csv");
}

export function getChangeOrders() {
  return parseCsv("change_orders.csv");
}

export function getBillingHistory() {
  return parseCsv("billing_history.csv");
}

export function getRfis() {
  return parseCsv("rfis.csv");
}

export function getFieldNotes() {
  return parseCsv("field_notes.csv");
}

// Portfolio-level margin summary
export function portfolioSummary() {
  const contracts = getContracts();
  const laborLogs = getLaborLogs();
  const materialDeliveries = getMaterialDeliveries();
  const changeOrders = getChangeOrders();
  const sovBudget = getSovBudget();

  return contracts.map((contract) => {
    const pid = contract.project_id;

    const laborCost = laborLogs
      .filter((l) => l.project_id === pid)
      .reduce((sum, l) => {
        const st = parseFloat(l.hours_st) || 0;
        const ot = parseFloat(l.hours_ot) || 0;
        const rate = parseFloat(l.hourly_rate) || 0;
        const burden = parseFloat(l.burden_multiplier) || 1;
        return sum + (st + ot * 1.5) * rate * burden;
      }, 0);

    const materialCost = materialDeliveries
      .filter((m) => m.project_id === pid)
      .reduce((sum, m) => sum + (parseFloat(m.total_cost) || 0), 0);

    const approvedCOs = changeOrders
      .filter((c) => c.project_id === pid && c.status === "Approved")
      .reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);

    const contractValue = parseFloat(contract.original_contract_value) || 0;
    const adjustedRevenue = contractValue + approvedCOs;
    const totalCost = laborCost + materialCost;
    const grossMargin = adjustedRevenue > 0 ? ((adjustedRevenue - totalCost) / adjustedRevenue) * 100 : 0;

    const budgetRows = sovBudget.filter((b) => b.project_id === pid);
    const estimatedLaborCost = budgetRows.reduce((s, b) => s + (parseFloat(b.estimated_labor_cost) || 0), 0);
    const estimatedMaterialCost = budgetRows.reduce((s, b) => s + (parseFloat(b.estimated_material_cost) || 0), 0);
    const laborOverrunPct = estimatedLaborCost > 0 ? ((laborCost - estimatedLaborCost) / estimatedLaborCost) * 100 : 0;
    const materialOverrunPct = estimatedMaterialCost > 0 ? ((materialCost - estimatedMaterialCost) / estimatedMaterialCost) * 100 : 0;

    return {
      project_id: pid,
      project_name: contract.project_name,
      contract_value: contractValue,
      adjusted_revenue: adjustedRevenue,
      labor_cost: Math.round(laborCost),
      material_cost: Math.round(materialCost),
      total_cost: Math.round(totalCost),
      gross_margin_pct: Math.round(grossMargin * 10) / 10,
      labor_overrun_pct: Math.round(laborOverrunPct * 10) / 10,
      material_overrun_pct: Math.round(materialOverrunPct * 10) / 10,
      approved_change_orders: Math.round(approvedCOs),
    };
  });
}

// SOV-level overrun detail for a project
export function sovOverrunDetail(projectId: string) {
  const sov = getSov().filter((s) => s.project_id === projectId);
  const budget = getSovBudget().filter((b) => b.project_id === projectId);
  const labor = getLaborLogs().filter((l) => l.project_id === projectId);
  const materials = getMaterialDeliveries().filter((m) => m.project_id === projectId);

  return sov.map((line) => {
    const lid = line.sov_line_id;
    const bud = budget.find((b) => b.sov_line_id === lid);

    const actualLabor = labor
      .filter((l) => l.sov_line_id === lid)
      .reduce((sum, l) => {
        const st = parseFloat(l.hours_st) || 0;
        const ot = parseFloat(l.hours_ot) || 0;
        const rate = parseFloat(l.hourly_rate) || 0;
        const burden = parseFloat(l.burden_multiplier) || 1;
        return sum + (st + ot * 1.5) * rate * burden;
      }, 0);

    const actualMaterial = materials
      .filter((m) => m.sov_line_id === lid)
      .reduce((sum, m) => sum + (parseFloat(m.total_cost) || 0), 0);

    const estLabor = parseFloat(bud?.estimated_labor_cost ?? "0") || 0;
    const estMaterial = parseFloat(bud?.estimated_material_cost ?? "0") || 0;

    const laborOverrunPct = estLabor > 0 ? ((actualLabor - estLabor) / estLabor) * 100 : 0;
    const materialOverrunPct = estMaterial > 0 ? ((actualMaterial - estMaterial) / estMaterial) * 100 : 0;

    return {
      sov_line_id: lid,
      description: line.description,
      estimated_labor_cost: Math.round(estLabor),
      actual_labor_cost: Math.round(actualLabor),
      labor_overrun_pct: Math.round(laborOverrunPct * 10) / 10,
      estimated_material_cost: Math.round(estMaterial),
      actual_material_cost: Math.round(actualMaterial),
      material_overrun_pct: Math.round(materialOverrunPct * 10) / 10,
    };
  });
}
