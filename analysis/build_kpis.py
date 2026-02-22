import pandas as pd
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "hvac_construction_dataset"

def load(filename):
    return pd.read_csv(DATA_DIR / filename, engine="python", on_bad_lines="skip")

contracts           = load("contracts.csv")
billing_history     = load("billing_history.csv")
labor_logs          = load("labor_logs.csv")
material_deliveries = load("material_deliveries.csv")

# Revenue per project
revenue = (
    billing_history
    .groupby("project_id")["period_total"]
    .sum()
    .rename("revenue")
)

# Actual labor cost per project
labor_logs["labor_cost"] = (
    (labor_logs["hours_st"] + 1.5 * labor_logs["hours_ot"])
    * labor_logs["hourly_rate"]
    * labor_logs["burden_multiplier"]
)
labor_cost = (
    labor_logs
    .groupby("project_id")["labor_cost"]
    .sum()
    .rename("actual_labor_cost")
)

# Actual material cost per project
material_cost = (
    material_deliveries
    .groupby("project_id")["total_cost"]
    .sum()
    .rename("actual_material_cost")
)

# Merge everything
summary = (
    contracts[["project_id", "project_name"]]
    .join(revenue, on="project_id")
    .join(labor_cost, on="project_id")
    .join(material_cost, on="project_id")
)

# Derived KPIs
summary["total_actual_cost"] = summary["actual_labor_cost"] + summary["actual_material_cost"]
summary["gross_profit"]      = summary["revenue"] - summary["total_actual_cost"]
summary["gross_margin"]      = summary["gross_profit"] / summary["revenue"]

pd.set_option("display.float_format", "{:,.2f}".format)
pd.set_option("display.max_columns", None)
pd.set_option("display.width", 200)

print("=" * 80)
print("FULL PORTFOLIO SUMMARY")
print("=" * 80)
print(summary[["project_id", "project_name", "revenue", "total_actual_cost", "gross_profit", "gross_margin"]].to_string(index=False))

print()
print("=" * 80)
print("5 PROJECTS WITH LOWEST GROSS MARGIN")
print("=" * 80)
worst = summary.nsmallest(5, "gross_margin")[
    ["project_id", "project_name", "revenue", "total_actual_cost", "gross_profit", "gross_margin"]
]
print(worst.to_string(index=False))
