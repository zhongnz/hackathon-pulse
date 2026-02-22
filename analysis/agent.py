import pandas as pd
from pathlib import Path
from groq import Groq
from dotenv import load_dotenv
import os

load_dotenv(Path(__file__).resolve().parent.parent / ".env")
print("DEBUG GROQ KEY:", os.getenv("GROQ_API_KEY"))

DATA_DIR = Path(__file__).parent.parent / "hvac_construction_dataset"

def load(filename):
    return pd.read_csv(DATA_DIR / filename, engine="python", on_bad_lines="skip")

# ── Load all data once ────────────────────────────────────────────────────────
contracts           = load("contracts.csv")
billing_history     = load("billing_history.csv")
labor_logs          = load("labor_logs.csv")
material_deliveries = load("material_deliveries.csv")
sov_budget          = load("sov_budget.csv")

labor_logs["labor_cost"] = (
    (labor_logs["hours_st"] + 1.5 * labor_logs["hours_ot"])
    * labor_logs["hourly_rate"]
    * labor_logs["burden_multiplier"]
)

# ── Step 1: Portfolio KPIs ────────────────────────────────────────────────────
revenue_by_project = (
    billing_history.groupby("project_id")["period_total"].sum().rename("revenue")
)
labor_by_project = (
    labor_logs.groupby("project_id")["labor_cost"].sum().rename("actual_labor_cost")
)
material_by_project = (
    material_deliveries.groupby("project_id")["total_cost"].sum().rename("actual_material_cost")
)

kpis = (
    contracts[["project_id", "project_name"]]
    .join(revenue_by_project, on="project_id")
    .join(labor_by_project, on="project_id")
    .join(material_by_project, on="project_id")
)
kpis["total_actual_cost"] = kpis["actual_labor_cost"] + kpis["actual_material_cost"]
kpis["gross_profit"]      = kpis["revenue"] - kpis["total_actual_cost"]
kpis["gross_margin"]      = kpis["gross_profit"] / kpis["revenue"]

# ── Step 2: Portfolio Risk Scan ───────────────────────────────────────────────
risk_rows = []

for project_id in contracts["project_id"]:
    ll = labor_logs[labor_logs["project_id"] == project_id]
    md = material_deliveries[material_deliveries["project_id"] == project_id]
    sb = sov_budget[sov_budget["project_id"] == project_id][
        ["sov_line_id", "estimated_labor_cost", "estimated_material_cost"]
    ].copy()

    actual_labor = (
        ll.groupby("sov_line_id")["labor_cost"].sum().rename("actual_labor_cost")
    )
    actual_material = (
        md.groupby("sov_line_id")["total_cost"].sum().rename("actual_material_cost")
    )

    line = (
        sb
        .join(actual_labor, on="sov_line_id")
        .join(actual_material, on="sov_line_id")
        .fillna(0)
    )
    line["labor_overrun"]    = line["actual_labor_cost"] - line["estimated_labor_cost"]
    line["material_overrun"] = line["actual_material_cost"] - line["estimated_material_cost"]

    labor_overrun_count = (
        (line["estimated_labor_cost"] > 0) &
        (line["labor_overrun"] > 0.5 * line["estimated_labor_cost"])
    ).sum()
    material_overrun_count = (
        (line["estimated_material_cost"] > 0) &
        (line["material_overrun"] > 0.5 * line["estimated_material_cost"])
    ).sum()

    risk_rows.append({
        "project_id":             project_id,
        "labor_overrun_lines":    int(labor_overrun_count),
        "material_overrun_lines": int(material_overrun_count),
        "risk_score":             int(material_overrun_count * 2 + labor_overrun_count),
    })

risk_df = (
    pd.DataFrame(risk_rows)
    .merge(contracts[["project_id", "project_name"]], on="project_id")
    .sort_values("risk_score", ascending=False)
    .reset_index(drop=True)
)

# ── Step 3: Identify highest-risk project ────────────────────────────────────
top = risk_df.iloc[0]
project_id   = top["project_id"]
project_name = top["project_name"]
risk_score   = top["risk_score"]
labor_lines  = top["labor_overrun_lines"]
material_lines = top["material_overrun_lines"]

project_kpi = kpis[kpis["project_id"] == project_id].iloc[0]
gross_margin      = project_kpi["gross_margin"]
total_labor_cost  = project_kpi["actual_labor_cost"]
total_material_cost = project_kpi["actual_material_cost"]

# ── Step 4: Classify root cause ───────────────────────────────────────────────
if material_lines > labor_lines * 1.5:
    root_cause = "Material Dominant"
elif labor_lines > material_lines * 1.5:
    root_cause = "Labor Dominant"
else:
    root_cause = "Mixed"

# ── Step 5: Recommended actions ──────────────────────────────────────────────
actions = {
    "Material Dominant": [
        "Audit material procurement for price variances and over-ordering",
        "Review vendor invoices against purchase orders on overrun SOV lines",
        "Check for untracked deliveries or duplicate receipts",
        "Negotiate retroactive credits or returns where possible",
    ],
    "Labor Dominant": [
        "Review crew timesheets for overtime patterns and unauthorized hours",
        "Assess productivity by trade on overrun SOV lines",
        "Evaluate whether scope has expanded without a signed change order",
        "Consider crew reallocation or subcontracting high-cost tasks",
    ],
    "Mixed": [
        "Conduct full cost audit across overrun SOV lines",
        "Identify whether labor and material overruns share the same work zones",
        "Check for unsigned change orders covering both labor and materials",
        "Prioritize recovery on lines with highest combined overrun dollar value",
    ],
}

# ── LLM Summary ──────────────────────────────────────────────────────────────
def generate_llm_summary(data_dict: dict) -> str:
    client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

    prompt = f"""You are a construction finance expert advising a CFO.

Analyze the following HVAC project data and write a concise executive report.

Project: {data_dict['project_id']} — {data_dict['project_name']}
Gross Margin: {data_dict['gross_margin']:.1%}
Risk Score: {data_dict['risk_score']}
Labor Overrun Lines: {data_dict['labor_overrun_lines']}
Material Overrun Lines: {data_dict['material_overrun_lines']}
Root Cause Classification: {data_dict['root_cause']}
Recommended Actions:
{chr(10).join(f"  - {a}" for a in data_dict['actions'])}

Portfolio Risk Ranking (all projects):
{data_dict['portfolio_ranking']}

Write a 3-paragraph executive report:
1. Situation summary — what is happening and how serious it is
2. Root cause analysis — why this project is underperforming
3. Recommended path forward — specific actions the CFO should take this week

Use plain English. Be direct. No bullet points — prose only."""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )
    return response.choices[0].message.content


# ── Print executive summary ───────────────────────────────────────────────────
print("=" * 60)
print("HVAC PORTFOLIO — EXECUTIVE RISK SUMMARY")
print("=" * 60)

print(f"\nHighest-Risk Project: {project_id} — {project_name}")
print(f"  Gross Margin:          {gross_margin:.1%}")
print(f"  Risk Score:            {risk_score}")
print(f"  Labor Overrun Lines:   {labor_lines}")
print(f"  Material Overrun Lines:{material_lines}")
print(f"  Root Cause:            {root_cause}")

print("\nRecommended Actions:")
for action in actions[root_cause]:
    print(f"  • {action}")

print("\n--- Full Portfolio Risk Ranking ---")
ranking_str = risk_df[["project_id", "project_name", "labor_overrun_lines", "material_overrun_lines", "risk_score"]].to_string(index=False)
print(ranking_str)

# ── LLM executive report (OpenAI) ────────────────────────────────────────────
if os.environ.get("OPENAI_API_KEY"):
    print("\n" + "=" * 60)
    print("AI EXECUTIVE REPORT")
    print("=" * 60)
    report = generate_llm_summary({
        "project_id":             project_id,
        "project_name":           project_name,
        "gross_margin":           gross_margin,
        "risk_score":             risk_score,
        "labor_overrun_lines":    labor_lines,
        "material_overrun_lines": material_lines,
        "root_cause":             root_cause,
        "actions":                actions[root_cause],
        "portfolio_ranking":      ranking_str,
    })
    print(report)
else:
    print("\n[Skipping OpenAI report — OPENAI_API_KEY not set]")

# ── LLM executive memo (Groq) ─────────────────────────────────────────────────
if os.getenv("GROQ_API_KEY"):
    structured_summary = f"""Project: {project_id} — {project_name}
Gross Margin: {gross_margin:.1%}
Risk Score: {risk_score}
Labor Overrun Lines: {labor_lines}
Material Overrun Lines: {material_lines}
Root Cause: {root_cause}

Recommended Actions:
{chr(10).join(f"  - {a}" for a in actions[root_cause])}

Portfolio Risk Ranking:
{ranking_str}

Write a concise 3-paragraph executive memo for the CFO:
1. What is happening and how serious it is
2. Why this project is underperforming
3. Specific actions to take this week"""

    groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    groq_response = groq_client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "system", "content": "You are a CFO-level construction risk advisor."},
            {"role": "user",   "content": structured_summary},
        ],
        temperature=0.3,
    )

    print("\n" + "=" * 60)
    print("LLM EXECUTIVE MEMO")
    print("=" * 60)
    print(groq_response.choices[0].message.content)
else:
    print("\n[Skipping Groq memo — GROQ_API_KEY not set]")