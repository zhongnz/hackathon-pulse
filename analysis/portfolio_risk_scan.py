import pandas as pd
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "hvac_construction_dataset"

def load(filename):
    return pd.read_csv(DATA_DIR / filename, engine="python", on_bad_lines="skip")

contracts           = load("contracts.csv")
labor_logs          = load("labor_logs.csv")
material_deliveries = load("material_deliveries.csv")
sov_budget          = load("sov_budget.csv")

# Precompute labor cost per row
labor_logs["labor_cost"] = (
    (labor_logs["hours_st"] + 1.5 * labor_logs["hours_ot"])
    * labor_logs["hourly_rate"]
    * labor_logs["burden_multiplier"]
)

results = []

for project_id in contracts["project_id"]:
    ll = labor_logs[labor_logs["project_id"] == project_id]
    md = material_deliveries[material_deliveries["project_id"] == project_id]
    sb = sov_budget[sov_budget["project_id"] == project_id][
        ["sov_line_id", "estimated_labor_cost", "estimated_material_cost"]
    ].copy()

    actual_labor = (
        ll.groupby("sov_line_id")["labor_cost"]
        .sum()
        .rename("actual_labor_cost")
    )
    actual_material = (
        md.groupby("sov_line_id")["total_cost"]
        .sum()
        .rename("actual_material_cost")
    )

    summary = (
        sb
        .join(actual_labor, on="sov_line_id")
        .join(actual_material, on="sov_line_id")
        .fillna(0)
    )

    summary["labor_overrun"]    = summary["actual_labor_cost"] - summary["estimated_labor_cost"]
    summary["material_overrun"] = summary["actual_material_cost"] - summary["estimated_material_cost"]

    labor_overrun_count = (
        (summary["estimated_labor_cost"] > 0) &
        (summary["labor_overrun"] > 0.5 * summary["estimated_labor_cost"])
    ).sum()

    material_overrun_count = (
        (summary["estimated_material_cost"] > 0) &
        (summary["material_overrun"] > 0.5 * summary["estimated_material_cost"])
    ).sum()

    risk_score = material_overrun_count * 2 + labor_overrun_count

    results.append({
        "project_id":             project_id,
        "labor_overrun_lines":    labor_overrun_count,
        "material_overrun_lines": material_overrun_count,
        "risk_score":             risk_score,
    })

risk_df = (
    pd.DataFrame(results)
    .merge(contracts[["project_id", "project_name"]], on="project_id")
    .sort_values("risk_score", ascending=False)
    .reset_index(drop=True)
)

print("=" * 70)
print("PORTFOLIO RISK SCAN — Ranked by Risk Score")
print("=" * 70)
print(risk_df[["project_id", "project_name", "labor_overrun_lines", "material_overrun_lines", "risk_score"]].to_string(index=False))
