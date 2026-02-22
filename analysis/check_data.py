import pandas as pd
from pathlib import Path

DATASET_DIR = Path(__file__).parent.parent / "hvac_construction_dataset"

csv_files = sorted(DATASET_DIR.glob("*.csv"))

for csv_path in csv_files:
    df = pd.read_csv(csv_path, engine="python", on_bad_lines="skip")

    print("=" * 60)
    print(f"FILE: {csv_path.name}")
    print(f"Rows: {len(df)}")
    print(f"Columns ({len(df.columns)}): {list(df.columns)}")
    print("First 3 rows:")
    print(df.head(3).to_string(index=False))
    print()
