# Proxy Gold Simulation Dataset Card

- Mode: `PROXY_GOLD_SIMULATION`
- Total records: 150,000
- Train: 120,000
- Validation: 15,000
- Calibration: 10,000
- Blind proxy session D: 5,000
- Scenario families: 41
- Ingredient classes: 14
- Generator/verifier disagreements: 6,624
- Adjudications: 6,624

## Generation

The canonical scenario library and labels were authored by GPT-5.6 Pro for this artifact. Bulk records were
expanded deterministically with conditional demographic, medication, condition, laboratory, wearable, preference,
and safety variations. Teacher sessions A/B/C/C2/D are disjoint by split. The final record is
`PROXY_GOLD_SIMULATION`, not pharmacist gold.

## Intended use

- Complete interim engineering research pipeline
- Train/retrain code verification
- KPI formula and report generation
- Agent, safety, evidence, and device workflow rehearsal

## Prohibited use

- Claiming licensed pharmacist labeling
- Clinical efficacy claims
- Actual ADR or production-device evidence
- KOLAS or external certification claims

