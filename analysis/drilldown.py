import pandas as pd
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "hvac_construction_dataset"
PROJECT_ID = "PRJ-2024-003"

def load(filename):
    return pd.read_csv(DATA_DIR / filename, engine="python", on_bad_lines="skip")

billing_history     = load("billing_history.csv")
labor_logs          = load("labor_logs.csv")
material_deliveries = load("material_deliveries.csv")
change_orders       = load("change_orders.csv")
rfis                = load("rfis.csv")

# Filter to target project
bh  = billing_history[billing_history["project_id"] == PROJECT_ID]
ll  = labor_logs[labor_logs["project_id"] == PROJECT_ID]
md  = material_deliveries[material_deliveries["project_id"] == PROJECT_ID]
co  = change_orders[change_orders["project_id"] == PROJECT_ID]
rfi = rfis[rfis["project_id"] == PROJECT_ID]

# Revenue
total_revenue = bh["period_total"].sum()

# Labor cost
ll["labor_cost"] = (
    (ll["hours_st"] + 1.5 * ll["hours_ot"])
    * ll["hourly_rate"]
    * ll["burden_multiplier"]
)
total_labor_cost = ll["labor_cost"].sum()

# Material cost
total_material_cost = md["total_cost"].sum()

# Cost breakdown
total_cost = total_labor_cost + total_material_cost
labor_pct    = total_labor_cost / total_cost * 100 if total_cost else 0
material_pct = total_material_cost / total_cost * 100 if total_cost else 0

# Change orders
n_co          = len(co)
n_co_approved = (co["status"].str.lower() == "approved").sum()
n_co_pending  = (co["status"].str.lower() == "pending").sum()

# RFIs
n_rfi             = len(rfi)
n_rfi_cost_impact = rfi["cost_impact"].astype(str).str.lower().isin(["true", "1", "yes"]).sum()

# Print summary
print("=" * 50)
print(f"DRILLDOWN: {PROJECT_ID}")
print("=" * 50)

print("\n--- Financials ---")
print(f"  Total Revenue:       ${total_revenue:>15,.2f}")
print(f"  Total Labor Cost:    ${total_labor_cost:>15,.2f}  ({labor_pct:.1f}%)")
print(f"  Total Material Cost: ${total_material_cost:>15,.2f}  ({material_pct:.1f}%)")
print(f"  Total Actual Cost:   ${total_cost:>15,.2f}")
print(f"  Gross Profit:        ${total_revenue - total_cost:>15,.2f}")

print("\n--- Change Orders ---")
print(f"  Total:     {n_co}")
print(f"  Approved:  {n_co_approved}")
print(f"  Pending:   {n_co_pending}")

print("\n--- RFIs ---")
print(f"  Total:         {n_rfi}")
print(f"  Cost Impact:   {n_rfi_cost_impact}")
