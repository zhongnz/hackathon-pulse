import fs from "fs"
import path from "path"
import Papa from "papaparse"
import type {
  ContractRow,
  SOVRow,
  SOVBudgetRow,
  LaborLogRow,
  ChangeOrderRow,
  RFIRow,
  FieldNoteRow,
  BillingHistoryRow,
  BillingLineItemRow,
  MaterialDeliveryRow,
} from "./types"

const DATA_DIR = path.join(process.cwd(), "hvac_construction_dataset")

function parseCSV<T>(filename: string): T[] {
  try {
    const filePath = path.join(DATA_DIR, filename)
    const raw = fs.readFileSync(filePath, "utf-8")
    const result = Papa.parse<T>(raw, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
    })
    return result.data
  } catch (err) {
    console.error(`[MarginGuard] Failed to parse ${filename}:`, err)
    return []
  }
}

// Module-level singletons - parsed once, reused across all requests
let _contracts: ContractRow[] | null = null
let _sov: SOVRow[] | null = null
let _sovBudget: SOVBudgetRow[] | null = null
let _laborLogs: LaborLogRow[] | null = null
let _changeOrders: ChangeOrderRow[] | null = null
let _rfis: RFIRow[] | null = null
let _fieldNotes: FieldNoteRow[] | null = null
let _billingHistory: BillingHistoryRow[] | null = null
let _billingLineItems: BillingLineItemRow[] | null = null
let _materialDeliveries: MaterialDeliveryRow[] | null = null

export function getContracts(): ContractRow[] {
  if (!_contracts) _contracts = parseCSV<ContractRow>("contracts.csv")
  return _contracts
}

export function getSOV(): SOVRow[] {
  if (!_sov) _sov = parseCSV<SOVRow>("sov.csv")
  return _sov
}

export function getSOVBudget(): SOVBudgetRow[] {
  if (!_sovBudget) _sovBudget = parseCSV<SOVBudgetRow>("sov_budget.csv")
  return _sovBudget
}

export function getLaborLogs(): LaborLogRow[] {
  if (!_laborLogs) _laborLogs = parseCSV<LaborLogRow>("labor_logs.csv")
  return _laborLogs
}

export function getChangeOrders(): ChangeOrderRow[] {
  if (!_changeOrders)
    _changeOrders = parseCSV<ChangeOrderRow>("change_orders.csv")
  return _changeOrders
}

export function getRFIs(): RFIRow[] {
  if (!_rfis) _rfis = parseCSV<RFIRow>("rfis.csv")
  return _rfis
}

export function getFieldNotes(): FieldNoteRow[] {
  if (!_fieldNotes) _fieldNotes = parseCSV<FieldNoteRow>("field_notes.csv")
  return _fieldNotes
}

export function getBillingHistory(): BillingHistoryRow[] {
  if (!_billingHistory)
    _billingHistory = parseCSV<BillingHistoryRow>("billing_history.csv")
  return _billingHistory
}

export function getBillingLineItems(): BillingLineItemRow[] {
  if (!_billingLineItems)
    _billingLineItems = parseCSV<BillingLineItemRow>("billing_line_items.csv")
  return _billingLineItems
}

export function getMaterialDeliveries(): MaterialDeliveryRow[] {
  if (!_materialDeliveries)
    _materialDeliveries = parseCSV<MaterialDeliveryRow>(
      "material_deliveries.csv"
    )
  return _materialDeliveries
}
