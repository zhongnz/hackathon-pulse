import pandas as pd
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "hvac_construction_dataset"
PROJECT_ID = "PRJ-2024-003"

def load(filename):
    return pd.read_csv(DATA_DIR / filename, engine="python", on_bad_lines="skip")

labor_logs          = load("labor_logs.csv")
material_deliveries = load("material_deliveries.csv")
sov_budget          = load("sov_budget.csv")

# Filter to target project
ll = labor_logs[labor_logs["project_id"] == PROJECT_ID].copy()
md = material_deliveries[material_deliveries["project_id"] == PROJECT_ID].copy()
sb = sov_budget[sov_budget["project_id"] == PROJECT_ID]

# Actual labor cost per sov_line_id
ll["labor_cost"] = (
    (ll["hours_st"] + 1.5 * ll["hours_ot"])
    * ll["hourly_rate"]
    * ll["burden_multiplier"]
)
actual_labor = (
    ll.groupby("sov_line_id")["labor_cost"]
    .sum()
    .rename("actual_labor_cost")
)

# Actual material cost per sov_line_id
actual_material = (
    md.groupby("sov_line_id")["total_cost"]
    .sum()
    .rename("actual_material_cost")
)

# Estimated costs from sov_budget
estimated = sb[["sov_line_id", "estimated_labor_cost", "estimated_material_cost"]].copy()

# Merge
summary = (
    estimated
    .join(actual_labor, on="sov_line_id")
    .join(actual_material, on="sov_line_id")
    .fillna(0)
)

# Overruns
summary["labor_overrun"]    = summary["actual_labor_cost"] - summary["estimated_labor_cost"]
summary["material_overrun"] = summary["actual_material_cost"] - summary["estimated_material_cost"]
summary["total_overrun"]    = summary["labor_overrun"] + summary["material_overrun"]

pd.set_option("display.float_format", "{:,.2f}".format)
pd.set_option("display.max_columns", None)
pd.set_option("display.width", 200)

print("=" * 70)
print(f"LINE-LEVEL ANALYSIS: {PROJECT_ID}")
print("=" * 70)
print("\nTop 5 SOV Lines by Total Overrun:")
top5 = summary.nlargest(5, "total_overrun")[
    ["sov_line_id", "estimated_labor_cost", "actual_labor_cost", "labor_overrun",
     "estimated_material_cost", "actual_material_cost", "material_overrun", "total_overrun"]
]
print(top5.to_string(index=False))
